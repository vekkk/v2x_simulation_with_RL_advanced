import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { CONFIG } from '../config/config.js';

export class VehicleManager {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = [];
        this.vehicleMeshes = new Map();
        this.lastSpawnTime = 0;
        this.spawnInterval = CONFIG.VEHICLES.SPAWN_INTERVAL;
        this.laneVehicles = Array.from({ length: CONFIG.ROAD.NUM_LANES * 2 }, () => []); // Double the lanes for both roads
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
            
            // Randomly choose between horizontal and vertical road
            const isVertical = Math.random() < 0.5;
            
            // Assign to a random lane
            const lane = Math.floor(Math.random() * CONFIG.ROAD.NUM_LANES);
            const totalRoadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
            const roadStartX = -totalRoadWidth / 2 + CONFIG.ROAD.LANE_WIDTH / 2;
            
            let x, z;
            if (isVertical) {
                x = roadStartX + lane * CONFIG.ROAD.LANE_WIDTH;
                z = -CONFIG.ROAD.LENGTH / 2 + (i / CONFIG.VEHICLES.NUM_VEHICLES) * CONFIG.ROAD.LENGTH + 
                    Math.random() * (CONFIG.ROAD.LENGTH / CONFIG.VEHICLES.NUM_VEHICLES / 2);
            } else {
                z = roadStartX + lane * CONFIG.ROAD.LANE_WIDTH;
                x = -CONFIG.ROAD.LENGTH / 2 + (i / CONFIG.VEHICLES.NUM_VEHICLES) * CONFIG.ROAD.LENGTH + 
                    Math.random() * (CONFIG.ROAD.LENGTH / CONFIG.VEHICLES.NUM_VEHICLES / 2);
            }
            
            // Find a safe initial position
            let attempts = 0;
            const maxAttempts = 50;
            do {
                attempts++;
                if (attempts > maxAttempts) {
                    console.warn("Could not find safe initial position for vehicle, placing anyway.");
                    break;
                }
            } while (!this.isPositionSafe(vehicle, isVertical ? z : x, lane, isVertical));

            vehicle.position.set(x, vehicleConfig.GEOMETRY.height / 2, z);
            vehicle.userData = {
                id: i,
                type: type,
                speed: this.getRandomSpeed(vehicleConfig.SPEED_RANGE),
                lastPacketTime: performance.now(),
                lane: lane,
                assignedLaneX: isVertical ? x : z,
                currentNetwork: 'None',
                communicationLine: null,
                isVertical: isVertical
            };
            
            this.scene.add(vehicle);
            this.vehicles.push(vehicle);
            this.laneVehicles[lane + (isVertical ? CONFIG.ROAD.NUM_LANES : 0)].push(vehicle);

            // Update summary
            this.vehicleSummary.totalVehicles++;
            this.vehicleSummary.byType[type] = (this.vehicleSummary.byType[type] || 0) + 1;
        }
    }

    isPositionSafe(vehicle, newPos, lane, isVertical) {
        const laneIndex = lane + (isVertical ? CONFIG.ROAD.NUM_LANES : 0);
        if (!this.laneVehicles[laneIndex]) {
            console.warn(`Lane ${laneIndex} is not properly initialized`);
            return false;
        }

        const vehicleLength = vehicle.geometry.parameters.length;
        const safetyMargin = 2;

        for (const otherVehicle of this.laneVehicles[laneIndex]) {
            if (!otherVehicle || otherVehicle === vehicle) continue;

            const otherLength = otherVehicle.geometry.parameters.length;
            const minDistance = (vehicleLength + otherLength) / 2 + safetyMargin;

            const otherPos = isVertical ? otherVehicle.position.z : otherVehicle.position.x;
            if (Math.abs(newPos - otherPos) < minDistance) {
                return false;
            }
        }
        return true;
    }

    updatePositions(deltaTime, currentTime) {
        // Sort vehicles by lane and position for proper collision detection
        this.vehicles.sort((a, b) => {
            if (a.userData.lane !== b.userData.lane) {
                return a.userData.lane - b.userData.lane;
            }
            const aPos = a.userData.isVertical ? a.position.z : a.position.x;
            const bPos = b.userData.isVertical ? b.position.z : b.position.x;
            return aPos - bPos;
        });
        
        this.vehicles.forEach(vehicle => {
            const isVertical = vehicle.userData.isVertical;
            const currentPos = isVertical ? vehicle.position.z : vehicle.position.x;
            const proposedPos = currentPos + vehicle.userData.speed * deltaTime;
            
            // Check for collisions with vehicles in the same lane
            const lane = vehicle.userData.lane;
            const vehicleLength = vehicle.geometry.parameters.length;
            const safetyMargin = 2; // Minimum distance between vehicles
            
            let canMove = true;
            for (const otherVehicle of this.vehicles) {
                if (otherVehicle === vehicle || otherVehicle.userData.lane !== lane || 
                    otherVehicle.userData.isVertical !== isVertical) continue;
                
                const otherLength = otherVehicle.geometry.parameters.length;
                const minDistance = (vehicleLength + otherLength) / 2 + safetyMargin;
                
                const otherPos = isVertical ? otherVehicle.position.z : otherVehicle.position.x;
                if (Math.abs(proposedPos - otherPos) < minDistance) {
                    canMove = false;
                    break;
                }
            }
            
            if (canMove) {
                if (isVertical) {
                    vehicle.position.z = proposedPos;
                } else {
                    vehicle.position.x = proposedPos;
                }
            }
            
            // Reset position if vehicle goes off screen
            if (isVertical) {
                if (vehicle.position.z > CONFIG.ROAD.LENGTH / 2) {
                    vehicle.position.z = -CONFIG.ROAD.LENGTH / 2;
                }
            } else {
                if (vehicle.position.x > CONFIG.ROAD.LENGTH / 2) {
                    vehicle.position.x = -CONFIG.ROAD.LENGTH / 2;
                }
            }
        });
    }

    getRandomSpeed(speedRange) {
        return speedRange.min + Math.random() * (speedRange.max - speedRange.min);
    }

    spawnVehicle() {
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const roadLength = CONFIG.ROAD.LENGTH;
        
        // Randomly choose lane (0 or 1)
        const lane = Math.floor(Math.random() * 2);
        // Randomly choose direction (left or right)
        const direction = Math.random() < 0.5 ? 1 : -1;
        
        // Calculate lane position
        const laneOffset = (lane * CONFIG.ROAD.LANE_WIDTH) + (CONFIG.ROAD.LANE_WIDTH / 2);
        const y = 0.5; // Height above road
        
        // Set initial position based on direction
        let x, z;
        if (direction === 1) {
            x = -roadLength / 2;
            z = laneOffset;
        } else {
            x = roadLength / 2;
            z = -laneOffset;
        }
        
        const position = new THREE.Vector3(x, y, z);
        
        // Create vehicle mesh
        const geometry = new THREE.BoxGeometry(4, 2, 2);
        const material = new THREE.MeshPhongMaterial({ 
            color: CONFIG.SCENE.COLORS.VEHICLE,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        // Rotate vehicle based on direction
        mesh.rotation.y = direction === 1 ? 0 : Math.PI;
        
        this.scene.add(mesh);
        
        // Store vehicle data
        const vehicle = {
            id: Date.now() + Math.random(),
            position: position,
            direction: direction,
            speed: CONFIG.VEHICLES.SPEED,
            lane: lane,
            mesh: mesh
        };
        
        this.vehicles.push(vehicle);
        this.vehicleMeshes.set(vehicle.id, mesh);
        
        return vehicle;
    }

    update(deltaTime) {
        // Spawn new vehicles
        const currentTime = Date.now();
        if (currentTime - this.lastSpawnTime >= this.spawnInterval) {
            this.spawnVehicle();
            this.lastSpawnTime = currentTime;
        }
        
        // Update vehicle positions
        this.vehicles = this.vehicles.filter(vehicle => {
            const mesh = this.vehicleMeshes.get(vehicle.id);
            if (!mesh) return false;
            
            // Move vehicle based on direction
            vehicle.position.x += vehicle.direction * vehicle.speed * deltaTime;
            mesh.position.copy(vehicle.position);
            
            // Remove vehicle if it's out of bounds
            const roadLength = CONFIG.ROAD.LENGTH;
            if (Math.abs(vehicle.position.x) > roadLength / 2) {
                this.scene.remove(mesh);
                this.vehicleMeshes.delete(vehicle.id);
                return false;
            }
            
            return true;
        });
    }

    getVehicles() {
        return this.vehicles;
    }
} 