import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
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
        
        // Only create vehicles if scene is available
        if (this.scene) {
            this.createVehicles();
        } else {
            console.warn('VehicleManager: Scene not available, deferring vehicle creation');
        }
    }

    // Add method to initialize vehicles when scene becomes available
    initializeVehicles() {
        if (!this.scene) {
            console.error('VehicleManager: Cannot initialize vehicles without scene');
            return;
        }
        if (this.vehicles.length === 0) {
            this.createVehicles();
        }
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
        const messageTypeStats = this.getMessageTypeStatistics();
        
        return {
            ...this.vehicleSummary,
            byMessageType: messageTypeStats,
            averageReward: this.getAverageReward(),
            totalMessageTypeChanges: this.getTotalMessageTypeChanges()
        };
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
            
            // Assign to a random lane with proper direction
            const lane = Math.floor(Math.random() * CONFIG.ROAD.NUM_LANES);
            const totalRoadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
            const roadStartX = -totalRoadWidth / 2 + CONFIG.ROAD.LANE_WIDTH / 2;
            const x = roadStartX + lane * CONFIG.ROAD.LANE_WIDTH;
            
            // Determine direction based on lane (lanes 0,1 go forward, lanes 2,3 go backward)
            const isForwardDirection = lane < CONFIG.ROAD.NUM_LANES / 2;
            const direction = isForwardDirection ? 1 : -1;
            
            // Find a safe initial position with proper spacing
            const spacing = CONFIG.ROAD.LENGTH / CONFIG.VEHICLES.NUM_VEHICLES;
            let z = -CONFIG.ROAD.LENGTH / 2 + (i * spacing) + Math.random() * (spacing * 0.5);
            
            // Adjust starting position based on direction
            if (!isForwardDirection) {
                z = CONFIG.ROAD.LENGTH / 2 - (i * spacing) - Math.random() * (spacing * 0.5);
                // Rotate vehicle 180 degrees for backward direction
                vehicle.rotation.y = Math.PI;
            }

            vehicle.position.set(x, vehicleConfig.GEOMETRY.height / 2, z);
            
            // Assign initial message type based on vehicle type and random factors
            const initialMessageType = this.assignInitialMessageType(type);
            const messageConfig = CONFIG.MESSAGE_TYPES[initialMessageType];
            
            vehicle.userData = {
                id: i,
                type: type,
                speed: this.getRandomSpeed(vehicleConfig.SPEED_RANGE),
                lastPacketTime: performance.now(),
                lane: lane,
                assignedLaneX: x,
                direction: direction, // 1 for forward, -1 for backward
                isForwardDirection: isForwardDirection,
                currentNetwork: 'None',
                communicationLine: null,
                // Message type related properties
                currentMessageType: initialMessageType,
                messageConfig: messageConfig,
                messageHistory: [],
                lastMessageTypeChange: performance.now(),
                messageTypeChangeInterval: 5000 + Math.random() * 10000, // 5-15 seconds
                // AI learning related properties
                qLearningState: null,
                rewardHistory: [],
                totalReward: 0
            };
            
            this.scene.add(vehicle);
            this.vehicles.push(vehicle);
            this.laneVehicles[lane].push(vehicle);

            // Update summary
            this.vehicleSummary.totalVehicles++;
            this.vehicleSummary.byType[type] = (this.vehicleSummary.byType[type] || 0) + 1;
        }
    }

    assignInitialMessageType(vehicleType) {
        // Assign message types based on vehicle type and realistic scenarios
        const messageTypes = Object.keys(CONFIG.MESSAGE_TYPES);
        
        // Different vehicle types have different message type preferences
        const typePreferences = {
            'CAR': {
                'BASIC_CAM_MESSAGE': 0.5,    // Most common for regular cars
                'SAFETY_MESSAGE': 0.3,       // Safety alerts
                'TRAFFIC_MESSAGE': 0.15,     // Traffic updates
                'INFOTAINMENT_MESSAGE': 0.05 // Entertainment
            },
            'TRUCK': {
                'BASIC_CAM_MESSAGE': 0.4,    // Position updates
                'SAFETY_MESSAGE': 0.4,       // High safety priority for trucks
                'TRAFFIC_MESSAGE': 0.2,      // Route optimization
                'INFOTAINMENT_MESSAGE': 0.0  // Less entertainment
            },
            'BUS': {
                'BASIC_CAM_MESSAGE': 0.3,    // Position updates
                'SAFETY_MESSAGE': 0.3,       // Passenger safety
                'TRAFFIC_MESSAGE': 0.3,      // Schedule optimization
                'INFOTAINMENT_MESSAGE': 0.1  // Passenger info
            }
        };
        
        const preferences = typePreferences[vehicleType] || typePreferences['CAR'];
        const random = Math.random();
        let cumulative = 0;
        
        for (const [messageType, probability] of Object.entries(preferences)) {
            cumulative += probability;
            if (random <= cumulative) {
                return messageType;
            }
        }
        
        return 'BASIC_CAM_MESSAGE'; // Fallback
    }

    updateMessageTypes(currentTime, ai) {
        this.vehicles.forEach(vehicle => {
            // Check if it's time to potentially change message type
            if (currentTime - vehicle.userData.lastMessageTypeChange >= vehicle.userData.messageTypeChangeInterval) {
                // Use AI to determine if message type should change
                if (ai) {
                    const newMessageType = ai.generateMessageType(vehicle);
                    if (newMessageType !== vehicle.userData.currentMessageType) {
                        this.changeVehicleMessageType(vehicle, newMessageType);
                        vehicle.userData.lastMessageTypeChange = currentTime;
                        // Randomize next change interval
                        vehicle.userData.messageTypeChangeInterval = 5000 + Math.random() * 10000;
                    }
                } else {
                    // Fallback: random message type change
                    if (Math.random() < 0.1) { // 10% chance to change
                        const messageTypes = Object.keys(CONFIG.MESSAGE_TYPES);
                        const newType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
                        this.changeVehicleMessageType(vehicle, newType);
                        vehicle.userData.lastMessageTypeChange = currentTime;
                    }
                }
            }
        });
    }

    changeVehicleMessageType(vehicle, newMessageType) {
        const oldMessageType = vehicle.userData.currentMessageType;
        vehicle.userData.currentMessageType = newMessageType;
        vehicle.userData.messageConfig = CONFIG.MESSAGE_TYPES[newMessageType];
        
        // Record message type change in history
        vehicle.userData.messageHistory.push({
            timestamp: performance.now(),
            oldType: oldMessageType,
            newType: newMessageType,
            reason: 'AI_DECISION' // Could be expanded with more reasons
        });
        
        // Keep history limited to last 10 changes
        if (vehicle.userData.messageHistory.length > 10) {
            vehicle.userData.messageHistory.shift();
        }
        
        console.log(`Vehicle ${vehicle.userData.id}: Changed message type from ${oldMessageType} to ${newMessageType}`);
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
        // Update message types first
        if (this.networkManager && this.networkManager.ai) {
            this.updateMessageTypes(currentTime, this.networkManager.ai);
        }
        
        this.vehicles.forEach(vehicle => {
            const currentSpeed = vehicle.userData.speed * vehicle.userData.direction;
            const proposedZ = vehicle.position.z + currentSpeed * deltaTime;
            
            // Check for collisions with vehicles in the same lane
            const lane = vehicle.userData.lane;
            const vehicleLength = vehicle.geometry.parameters.length;
            const safetyMargin = 5; // Increased safety margin
            
            let canMove = true;
            let nearestVehicleDistance = Infinity;
            
            // Check collision with vehicles in same lane
            for (const otherVehicle of this.vehicles) {
                if (otherVehicle === vehicle || otherVehicle.userData.lane !== lane) continue;
                
                const otherLength = otherVehicle.geometry.parameters.length;
                const minDistance = (vehicleLength + otherLength) / 2 + safetyMargin;
                const distance = Math.abs(proposedZ - otherVehicle.position.z);
                
                // Only check collision if vehicles are moving in same direction or approaching each other
                const sameDirection = vehicle.userData.direction === otherVehicle.userData.direction;
                const approaching = !sameDirection && 
                    ((vehicle.userData.direction > 0 && vehicle.position.z < otherVehicle.position.z) ||
                     (vehicle.userData.direction < 0 && vehicle.position.z > otherVehicle.position.z));
                
                if (distance < minDistance && (sameDirection || approaching)) {
                    // If same direction, only block if the other vehicle is ahead
                    if (sameDirection) {
                        const isAhead = (vehicle.userData.direction > 0 && otherVehicle.position.z > vehicle.position.z) ||
                                       (vehicle.userData.direction < 0 && otherVehicle.position.z < vehicle.position.z);
                        if (isAhead) {
                            canMove = false;
                            nearestVehicleDistance = distance;
                            break;
                        }
                    } else {
                        // Opposite directions - always avoid collision
                        canMove = false;
                        break;
                    }
                }
            }
            
            // Adaptive speed based on traffic
            if (!canMove && nearestVehicleDistance < safetyMargin * 2) {
                // Slow down when close to another vehicle
                vehicle.userData.speed = Math.max(vehicle.userData.speed * 0.5, 5);
            } else if (canMove) {
                // Speed up when clear
                const maxSpeed = CONFIG.VEHICLES.TYPES[vehicle.userData.type].SPEED_RANGE.max;
                vehicle.userData.speed = Math.min(vehicle.userData.speed * 1.02, maxSpeed);
            }
            
            if (canMove) {
                vehicle.position.z = proposedZ;
            }
            
            // Reset position if vehicle goes off screen
            const roadBoundary = CONFIG.ROAD.LENGTH / 2;
            if ((vehicle.userData.direction > 0 && vehicle.position.z > roadBoundary) ||
                (vehicle.userData.direction < 0 && vehicle.position.z < -roadBoundary)) {
                
                // Reset to opposite end
                if (vehicle.userData.direction > 0) {
                    vehicle.position.z = -roadBoundary;
                } else {
                    vehicle.position.z = roadBoundary;
                }
                
                // Reset speed and message type
                vehicle.userData.speed = this.getRandomSpeed(CONFIG.VEHICLES.TYPES[vehicle.userData.type].SPEED_RANGE);
                const newMessageType = this.assignInitialMessageType(vehicle.userData.type);
                this.changeVehicleMessageType(vehicle, newMessageType);
            }
            
            // Update AI state for reinforcement learning
            if (this.networkManager && this.networkManager.ai) {
                vehicle.userData.qLearningState = this.networkManager.ai.createState(vehicle);
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
        const vehicle = new THREE.Group();
        
        // Create vehicle body based on type
        switch(type) {
            case 'CAR':
                // Car body
                const carBody = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        vehicleConfig.GEOMETRY.width,
                        vehicleConfig.GEOMETRY.height * 0.4,
                        vehicleConfig.GEOMETRY.length
                    ),
                    new THREE.MeshPhongMaterial({ 
                        color: vehicleConfig.MODEL.bodyColor,
                        shininess: 30,
                        specular: 0x444444
                    })
                );
                carBody.position.y = vehicleConfig.GEOMETRY.height * 0.2;
                
                // Car cabin
                const carCabin = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        vehicleConfig.GEOMETRY.width * 0.9,
                        vehicleConfig.GEOMETRY.height * 0.6,
                        vehicleConfig.GEOMETRY.length * 0.5
                    ),
                    new THREE.MeshPhongMaterial({ 
                        color: vehicleConfig.MODEL.windowColor,
                        transparent: true,
                        opacity: 0.7,
                        shininess: 90,
                        specular: 0x666666
                    })
                );
                carCabin.position.y = vehicleConfig.GEOMETRY.height * 0.5;
                carCabin.position.z = -vehicleConfig.GEOMETRY.length * 0.1;
                
                // Wheels
                const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
                const wheelMaterial = new THREE.MeshPhongMaterial({ 
                    color: vehicleConfig.MODEL.wheelColor,
                    shininess: 50
                });
                
                const wheelPositions = [
                    { x: -vehicleConfig.GEOMETRY.width/2 - 0.15, z: vehicleConfig.GEOMETRY.length/3 },
                    { x: vehicleConfig.GEOMETRY.width/2 + 0.15, z: vehicleConfig.GEOMETRY.length/3 },
                    { x: -vehicleConfig.GEOMETRY.width/2 - 0.15, z: -vehicleConfig.GEOMETRY.length/3 },
                    { x: vehicleConfig.GEOMETRY.width/2 + 0.15, z: -vehicleConfig.GEOMETRY.length/3 }
                ];
                
                wheelPositions.forEach(pos => {
                    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                    wheel.rotation.z = Math.PI / 2;
                    wheel.position.set(pos.x, 0.4, pos.z);
                    vehicle.add(wheel);
                });
                
                // Headlights
                const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
                const headlightMaterial = new THREE.MeshPhongMaterial({ 
                    color: vehicleConfig.MODEL.headlightColor,
                    emissive: vehicleConfig.MODEL.headlightColor,
                    emissiveIntensity: 0.5
                });
                
                const headlightPositions = [
                    { x: -vehicleConfig.GEOMETRY.width/3, z: vehicleConfig.GEOMETRY.length/2 },
                    { x: vehicleConfig.GEOMETRY.width/3, z: vehicleConfig.GEOMETRY.length/2 }
                ];
                
                headlightPositions.forEach(pos => {
                    const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
                    headlight.position.set(pos.x, 0.5, pos.z);
                    vehicle.add(headlight);
                });
                
                vehicle.add(carBody);
                vehicle.add(carCabin);
                break;
                
            case 'TRUCK':
                // Truck cabin
                const truckCabin = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        vehicleConfig.GEOMETRY.width * 0.8,
                        vehicleConfig.GEOMETRY.height * 0.4,
                        vehicleConfig.GEOMETRY.length * 0.3
                    ),
                    new THREE.MeshPhongMaterial({ 
                        color: vehicleConfig.MODEL.cabinColor,
                        shininess: 30,
                        specular: 0x444444
                    })
                );
                truckCabin.position.y = vehicleConfig.GEOMETRY.height * 0.2;
                truckCabin.position.z = vehicleConfig.GEOMETRY.length * 0.35;
                
                // Truck body
                const truckBody = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        vehicleConfig.GEOMETRY.width,
                        vehicleConfig.GEOMETRY.height * 0.6,
                        vehicleConfig.GEOMETRY.length * 0.7
                    ),
                    new THREE.MeshPhongMaterial({ 
                        color: vehicleConfig.MODEL.bodyColor,
                        shininess: 30,
                        specular: 0x444444
                    })
                );
                truckBody.position.y = vehicleConfig.GEOMETRY.height * 0.3;
                truckBody.position.z = -vehicleConfig.GEOMETRY.length * 0.15;
                
                // Wheels
                const truckWheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
                const truckWheelMaterial = new THREE.MeshPhongMaterial({ 
                    color: vehicleConfig.MODEL.wheelColor,
                    shininess: 50
                });
                
                const truckWheelPositions = [
                    { x: -vehicleConfig.GEOMETRY.width/2 - 0.2, z: vehicleConfig.GEOMETRY.length/3 },
                    { x: vehicleConfig.GEOMETRY.width/2 + 0.2, z: vehicleConfig.GEOMETRY.length/3 },
                    { x: -vehicleConfig.GEOMETRY.width/2 - 0.2, z: -vehicleConfig.GEOMETRY.length/3 },
                    { x: vehicleConfig.GEOMETRY.width/2 + 0.2, z: -vehicleConfig.GEOMETRY.length/3 }
                ];
                
                truckWheelPositions.forEach(pos => {
                    const wheel = new THREE.Mesh(truckWheelGeometry, truckWheelMaterial);
                    wheel.rotation.z = Math.PI / 2;
                    wheel.position.set(pos.x, 0.6, pos.z);
                    vehicle.add(wheel);
                });
                
                vehicle.add(truckCabin);
                vehicle.add(truckBody);
                break;
                
            case 'BUS':
                // Bus body
                const busBody = new THREE.Mesh(
                    new THREE.BoxGeometry(
                        vehicleConfig.GEOMETRY.width,
                        vehicleConfig.GEOMETRY.height * 0.8,
                        vehicleConfig.GEOMETRY.length
                    ),
                    new THREE.MeshPhongMaterial({ 
                        color: vehicleConfig.MODEL.bodyColor,
                        shininess: 30,
                        specular: 0x444444
                    })
                );
                busBody.position.y = vehicleConfig.GEOMETRY.height * 0.4;
                
                // Bus windows
                const windowRows = 3;
                const windowColumns = 4;
                const windowWidth = vehicleConfig.GEOMETRY.width * 0.8;
                const windowHeight = vehicleConfig.GEOMETRY.height * 0.2;
                const windowDepth = 0.1;
                const windowSpacing = vehicleConfig.GEOMETRY.length / (windowColumns + 1);
                const windowVerticalSpacing = vehicleConfig.GEOMETRY.height * 0.6 / (windowRows + 1);
                
                for (let row = 0; row < windowRows; row++) {
                    for (let col = 0; col < windowColumns; col++) {
                        const window = new THREE.Mesh(
                            new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth),
                            new THREE.MeshPhongMaterial({ 
                                color: vehicleConfig.MODEL.windowColor,
                                transparent: true,
                                opacity: 0.7,
                                shininess: 90,
                                specular: 0x666666
                            })
                        );
                        window.position.set(
                            0,
                            vehicleConfig.GEOMETRY.height * 0.2 + row * windowVerticalSpacing,
                            -vehicleConfig.GEOMETRY.length/2 + (col + 1) * windowSpacing
                        );
                        vehicle.add(window);
                    }
                }
                
                // Wheels
                const busWheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
                const busWheelMaterial = new THREE.MeshPhongMaterial({ 
                    color: vehicleConfig.MODEL.wheelColor,
                    shininess: 50
                });
                
                const busWheelPositions = [
                    { x: -vehicleConfig.GEOMETRY.width/2 - 0.2, z: vehicleConfig.GEOMETRY.length/3 },
                    { x: vehicleConfig.GEOMETRY.width/2 + 0.2, z: vehicleConfig.GEOMETRY.length/3 },
                    { x: -vehicleConfig.GEOMETRY.width/2 - 0.2, z: -vehicleConfig.GEOMETRY.length/3 },
                    { x: vehicleConfig.GEOMETRY.width/2 + 0.2, z: -vehicleConfig.GEOMETRY.length/3 }
                ];
                
                busWheelPositions.forEach(pos => {
                    const wheel = new THREE.Mesh(busWheelGeometry, busWheelMaterial);
                    wheel.rotation.z = Math.PI / 2;
                    wheel.position.set(pos.x, 0.5, pos.z);
                    vehicle.add(wheel);
                });
                
                vehicle.add(busBody);
                break;
        }
        
        // Add vehicle to scene
        this.scene.add(vehicle);
        
        // Initialize vehicle properties
        const speed = Math.random() * 
            (vehicleConfig.SPEED_RANGE.max - vehicleConfig.SPEED_RANGE.min) + 
            vehicleConfig.SPEED_RANGE.min;
            
        const lane = Math.floor(Math.random() * CONFIG.ROAD.NUM_LANES);
        const lanePosition = this.calculateLanePosition(lane);
        
        vehicle.position.set(
            lanePosition,
            0,
            -CONFIG.ROAD.LENGTH/2 + Math.random() * CONFIG.ROAD.LENGTH
        );
        
        // Store vehicle data
        this.vehicles.push({
            object: vehicle,
            type: type,
            speed: speed,
            lane: lane,
            network: null,
            lastPacketTime: 0
        });
        
        return vehicle;
    }

    getMessageTypeStatistics() {
        const stats = {};
        Object.keys(CONFIG.MESSAGE_TYPES).forEach(type => {
            stats[type] = 0;
        });
        
        this.vehicles.forEach(vehicle => {
            const messageType = vehicle.userData.currentMessageType;
            if (stats.hasOwnProperty(messageType)) {
                stats[messageType]++;
            }
        });
        
        return stats;
    }

    getVehiclesByMessageType(messageType) {
        return this.vehicles.filter(vehicle => 
            vehicle.userData.currentMessageType === messageType
        );
    }

    getAverageReward() {
        const totalReward = this.vehicles.reduce((sum, vehicle) => 
            sum + (vehicle.userData.totalReward || 0), 0
        );
        return this.vehicles.length > 0 ? totalReward / this.vehicles.length : 0;
    }

    getTotalMessageTypeChanges() {
        return this.vehicles.reduce((sum, vehicle) => 
            sum + (vehicle.userData.messageHistory?.length || 0), 0
        );
    }
} 