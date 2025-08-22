// DISABLED: import * as THREE from 'three';
import { CONFIG } from '../config/config.js';

export class VehicleManager {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = [];
        this.laneVehicles = Array.from({ length: CONFIG.ROAD.NUM_LANES }, () => []);
        this.vehicleCount = 0;
        this.handoverCount = 0;
        this.vehicleSummary = {
            totalVehicles: 0,
            byType: {},
            byNetwork: {
                DSRC: 0,
                WIFI: 0,
                LTE: 0,
                None: 0
            }
        };
        this.networkManager = null;
        this.createVehicles();
    }

    setNetworkManager(networkManager) {
        this.networkManager = networkManager;
    }

    incrementHandoverCount() {
        this.handoverCount++;
    }

    getHandoverCount() {
        return this.handoverCount;
    }

    getVehicleSummary() {
        return this.vehicleSummary;
    }

    createVehicles() {
        for (let i = 0; i < CONFIG.VEHICLES.NUM_VEHICLES; i++) {
            const typesArray = Object.keys(CONFIG.VEHICLES.TYPES);
            const type = typesArray[Math.floor(Math.random() * typesArray.length)];
            const vehicleConfig = CONFIG.VEHICLES.TYPES[type];
            
            const vehicle = new THREE.Mesh(
                new THREE.BoxGeometry(
                    vehicleConfig.GEOMETRY.width,
                    vehicleConfig.GEOMETRY.height,
                    vehicleConfig.GEOMETRY.length
                ),
                new THREE.MeshPhongMaterial({ color: vehicleConfig.COLOR })
            );
            vehicle.castShadow = true;
            
            // Assign to a random lane
            const lane = Math.floor(Math.random() * CONFIG.ROAD.NUM_LANES);
            const totalRoadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
            const roadStartX = -totalRoadWidth / 2 + CONFIG.ROAD.LANE_WIDTH / 2;
            const x = roadStartX + lane * CONFIG.ROAD.LANE_WIDTH;
            
            // Find a safe initial position
            let z;
            let attempts = 0;
            const maxAttempts = 50;
            do {
                z = -CONFIG.ROAD.LENGTH / 2 + (i / CONFIG.VEHICLES.NUM_VEHICLES) * CONFIG.ROAD.LENGTH + 
                    Math.random() * (CONFIG.ROAD.LENGTH / CONFIG.VEHICLES.NUM_VEHICLES / 2);
                attempts++;
                if (attempts > maxAttempts) {
                    console.warn("Could not find safe initial position for vehicle, placing anyway.");
                    break;
                }
            } while (!this.isPositionSafe(vehicle, z, lane));

            vehicle.position.set(x, vehicleConfig.GEOMETRY.height / 2, z);
            vehicle.userData = {
                id: i,
                type: type,
                speed: this.getRandomSpeed(vehicleConfig.SPEED_RANGE),
                lastPacketTime: performance.now(),
                lane: lane,
                assignedLaneX: x,
                currentNetwork: 'None',
                communicationLine: null
            };
            
            this.scene.add(vehicle);
            this.vehicles.push(vehicle);
            this.laneVehicles[lane].push(vehicle);

            // Update summary
            this.vehicleSummary.totalVehicles++;
            this.vehicleSummary.byType[type] = (this.vehicleSummary.byType[type] || 0) + 1;
        }
    }

    isPositionSafe(vehicle, newZ, lane) {
        if (!this.laneVehicles[lane]) {
            console.warn(`Lane ${lane} is not properly initialized`);
            return false;
        }

        const vehicleLength = vehicle.geometry.parameters.length;
        const safetyMargin = 2;

        for (const otherVehicle of this.laneVehicles[lane]) {
            if (!otherVehicle || otherVehicle === vehicle) continue;

            const otherLength = otherVehicle.geometry.parameters.length;
            const minDistance = (vehicleLength + otherLength) / 2 + safetyMargin;

            if (Math.abs(newZ - otherVehicle.position.z) < minDistance) {
                return false;
            }
        }
        return true;
    }

    getRandomSpeed(speedRange) {
        return speedRange.min + Math.random() * (speedRange.max - speedRange.min);
    }

    updatePositions(deltaTime, currentTime) {
        // Sort vehicles by lane and z-position for proper collision detection
        this.vehicles.sort((a, b) => {
            if (a.userData.lane !== b.userData.lane) {
                return a.userData.lane - b.userData.lane;
            }
            return a.position.z - b.position.z;
        });
        
        this.vehicles.forEach(vehicle => {
            const proposedZ = vehicle.position.z + vehicle.userData.speed * deltaTime;
            
            // Check for collisions with vehicles in the same lane
            const lane = vehicle.userData.lane;
            const vehicleLength = vehicle.geometry.parameters.length;
            const safetyMargin = 2; // Minimum distance between vehicles
            
            let canMove = true;
            for (const otherVehicle of this.vehicles) {
                if (otherVehicle === vehicle || otherVehicle.userData.lane !== lane) continue;
                
                const otherLength = otherVehicle.geometry.parameters.length;
                const minDistance = (vehicleLength + otherLength) / 2 + safetyMargin;
                
                if (Math.abs(proposedZ - otherVehicle.position.z) < minDistance) {
                    canMove = false;
                    break;
                }
            }
            
            if (canMove) {
                vehicle.position.z = proposedZ;
            }
            
            // Reset position if vehicle goes off screen
            if (vehicle.position.z > CONFIG.ROAD.LENGTH / 2) {
                vehicle.position.z = -CONFIG.ROAD.LENGTH / 2;
            }
            
            // Send packets at regular intervals
            if (currentTime - vehicle.userData.lastPacketTime >= CONFIG.NETWORK.PACKET_SEND_INTERVAL) {
                if (this.networkManager) {
                    const network = this.networkManager.selectBestNetwork(vehicle);
                    if (network) {
                        this.updateVehicleNetwork(vehicle, network);
                    }
                }
                vehicle.userData.lastPacketTime = currentTime;
            }
        });
    }

    getRandomVehicleType() {
        const types = Object.keys(CONFIG.VEHICLES.TYPES);
        return types[Math.floor(Math.random() * types.length)];
    }

    resetVehicles() {
        this.vehicles.forEach(vehicle => {
            vehicle.userData.lastPacketTime = 0;
            if (vehicle.userData.communicationLine) {
                this.scene.remove(vehicle.userData.communicationLine);
                vehicle.userData.communicationLine.geometry.dispose();
                vehicle.userData.communicationLine.material.dispose();
                vehicle.userData.communicationLine = null;
            }
        });
        this.vehicles = [];
        this.vehicleCount = 0;
        this.vehicleSummary = {
            totalVehicles: 0,
            byType: {},
            byNetwork: {
                DSRC: 0,
                WIFI: 0,
                LTE: 0,
                None: 0
            }
        };
    }

    updateVehicleNetwork(vehicle, newNetwork) {
        if (vehicle.userData.currentNetwork !== newNetwork) {
            // Decrement old network count
            if (vehicle.userData.currentNetwork) {
                this.vehicleSummary.byNetwork[vehicle.userData.currentNetwork]--;
            } else {
                this.vehicleSummary.byNetwork.None--;
            }
            
            // Update vehicle's network
            vehicle.userData.currentNetwork = newNetwork;
            
            // Increment new network count
            if (newNetwork) {
                this.vehicleSummary.byNetwork[newNetwork]++;
            } else {
                this.vehicleSummary.byNetwork.None++;
            }
        }
    }

    createVehicle(type) {
        const vehicleConfig = CONFIG.VEHICLES.TYPES[type];
        const geometry = new THREE.BoxGeometry(
            vehicleConfig.GEOMETRY.width,
            vehicleConfig.GEOMETRY.height,
            vehicleConfig.GEOMETRY.length
        );
        const material = new THREE.MeshPhongMaterial({ color: vehicleConfig.COLOR });
        const vehicle = new THREE.Mesh(geometry, material);
        
        // Set initial position
        vehicle.position.set(
            -CONFIG.ROAD.LENGTH,
            0,
            0
        );
        
        // Store vehicle data
        vehicle.userData = {
            type: type,
            speed: this.getRandomSpeed(vehicleConfig.SPEED_RANGE),
            lastPacketTime: performance.now(),
            currentNetwork: null
        };
        
        this.vehicles.push(vehicle);
        this.scene.add(vehicle);
        return vehicle;
    }
} 