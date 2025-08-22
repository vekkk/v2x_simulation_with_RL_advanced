import * as THREE from 'three';
import { CONFIG } from '../config/config.js';

export class VehicleManager {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = [];
        this.laneVehicles = Array.from({ length: CONFIG.ROAD.NUM_LANES }, () => []);
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
                lastPacketTime: 0,
                lane: lane,
                assignedLaneX: x,
                currentNetwork: 'None',
                communicationLine: null
            };
            
            this.scene.add(vehicle);
            this.vehicles.push(vehicle);
            this.laneVehicles[lane].push(vehicle);
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

    updatePositions(deltaTime) {
        this.vehicles.forEach(vehicle => {
            // Strict lane keeping
            vehicle.position.x = vehicle.userData.assignedLaneX;

            const currentZ = vehicle.position.z;
            const newZ = currentZ + vehicle.userData.speed;
            
            // Collision avoidance
            if (!this.isPositionSafe(vehicle, newZ, vehicle.userData.lane)) {
                vehicle.userData.speed *= 0.95;
                const vehicleConfig = CONFIG.VEHICLES.TYPES[vehicle.userData.type];
                if (vehicle.userData.speed < vehicleConfig.SPEED_RANGE.min) {
                    vehicle.userData.speed = vehicleConfig.SPEED_RANGE.min;
                }
            } else {
                // Speed recovery
                const vehicleConfig = CONFIG.VEHICLES.TYPES[vehicle.userData.type];
                vehicle.userData.speed = Math.min(
                    vehicleConfig.SPEED_RANGE.max,
                    vehicle.userData.speed * 1.01 + 0.001
                );
            }

            vehicle.position.z += vehicle.userData.speed;
            
            // Wrap around
            if (vehicle.position.z > CONFIG.ROAD.LENGTH / 2 + CONFIG.ROAD.LENGTH / 10) {
                vehicle.position.z = -CONFIG.ROAD.LENGTH / 2 - CONFIG.ROAD.LENGTH / 10;
                const vehicleConfig = CONFIG.VEHICLES.TYPES[vehicle.userData.type];
                vehicle.userData.speed = this.getRandomSpeed(vehicleConfig.SPEED_RANGE);
            }
        });
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
    }
} 