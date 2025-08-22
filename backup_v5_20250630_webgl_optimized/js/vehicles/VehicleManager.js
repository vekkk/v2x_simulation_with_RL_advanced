import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { CONFIG } from '../config/config.js';

export class VehicleManager {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = [];
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
        
        // Create shared materials once to avoid WebGL texture limits
        this.sharedMaterials = this.createSharedMaterials();
        
        // Initialize lane vehicles array for position checking
        this.laneVehicles = {};
        for (let i = 0; i < CONFIG.ROAD.NUM_LANES; i++) {
            this.laneVehicles[i] = [];
        }
        
        this.initializeVehicles();
    }

    initializeVehicles() {
        // Only create vehicles if scene is available
        if (this.scene) {
            this.createVehicles();
        } else {
            console.warn('VehicleManager: Scene not available, deferring vehicle creation');
        }
    }

    setNetworkManager(networkManager) {
        this.networkManager = networkManager;
    }

    setProcessingManager(processingManager) {
        this.processingManager = processingManager;
        console.log('ProcessingManager integrated with VehicleManager');
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
            
            // Create detailed 3D vehicle model instead of simple box
            const vehicle = this.createVehicle(type);
            vehicle.castShadow = false; // Disable shadows to save texture units
            
            // Assign basic vehicle data first (needed for isPositionSafe)
            vehicle.userData = {
                id: i,
                type: type
            };
            
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

            // Position vehicle on the road surface (raised to match road height)
            vehicle.position.set(x, vehicleConfig.GEOMETRY.height / 2 + 0.1, z);
            
            // Assign initial message type based on vehicle type and random factors
            const initialMessageType = this.assignInitialMessageType(type);
            const messageConfig = CONFIG.MESSAGE_TYPES[initialMessageType];
            
            // Complete the userData assignment
            vehicle.userData = {
                id: i,
                type: type,
                speed: this.getRandomSpeed(vehicleConfig.SPEED_RANGE),
                lastPacketTime: performance.now(),
                lane: lane,
                assignedLaneX: x,
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
        
        console.log(`🚗 Created ${CONFIG.VEHICLES.NUM_VEHICLES} detailed 3D vehicles`);
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

        // Get vehicle length from config instead of geometry parameters
        const vehicleType = vehicle.userData?.type || 'CAR';
        const vehicleConfig = CONFIG.VEHICLES.TYPES[vehicleType];
        const vehicleLength = vehicleConfig ? vehicleConfig.GEOMETRY.length : 4; // Default to 4 if config missing
        const safetyMargin = 2;

        for (const otherVehicle of this.laneVehicles[lane]) {
            if (!otherVehicle || otherVehicle === vehicle) continue;

            // Get other vehicle length from config
            const otherVehicleType = otherVehicle.userData?.type || 'CAR';
            const otherVehicleConfig = CONFIG.VEHICLES.TYPES[otherVehicleType];
            const otherLength = otherVehicleConfig ? otherVehicleConfig.GEOMETRY.length : 4; // Default to 4 if config missing
            
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
            // Use vehicle configuration data instead of geometry parameters
            const vehicleConfig = CONFIG.VEHICLES.TYPES[vehicle.userData.type];
            const vehicleLength = vehicleConfig.GEOMETRY.length;
            const safetyMargin = 2; // Minimum distance between vehicles
            
            let canMove = true;
            for (const otherVehicle of this.vehicles) {
                if (otherVehicle === vehicle || otherVehicle.userData.lane !== lane) continue;
                
                // Use vehicle configuration data for other vehicle too
                const otherVehicleConfig = CONFIG.VEHICLES.TYPES[otherVehicle.userData.type];
                const otherLength = otherVehicleConfig.GEOMETRY.length;
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
                // Reset message type when vehicle resets position (new journey)
                const newMessageType = this.assignInitialMessageType(vehicle.userData.type);
                this.changeVehicleMessageType(vehicle, newMessageType);
            }
            
            // Update AI state for reinforcement learning
            if (this.networkManager && this.networkManager.ai) {
                vehicle.userData.qLearningState = this.networkManager.ai.createState(vehicle);
                
                // Submit AI learning task to processing manager if available
                if (this.processingManager && Math.random() < 0.1) { // 10% chance per frame to submit learning task
                    this.submitAILearningTask(vehicle);
                }
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
        
        // Create shared materials to reduce WebGL texture usage
        const bodyMaterial = this.sharedMaterials[`${type}Body`];
        const windowMaterial = this.sharedMaterials[`${type}Window`];
        const wheelMaterial = this.sharedMaterials[`${type}Wheel`];
        const headlightMaterial = this.sharedMaterials[`${type}Headlight`];
        
        // Create vehicle body based on type
        if (type === 'CAR') {
            // Car specific geometry
            const carBody = new THREE.Mesh(
                new THREE.BoxGeometry(
                    vehicleConfig.GEOMETRY.width,
                    vehicleConfig.GEOMETRY.height * 0.6,
                    vehicleConfig.GEOMETRY.length
                ),
                this.sharedMaterials.carBody
            );
            carBody.position.y = vehicleConfig.GEOMETRY.height * 0.3;
            vehicle.add(carBody);
            
            // Car windows
            const frontWindow = new THREE.Mesh(
                new THREE.BoxGeometry(
                    vehicleConfig.GEOMETRY.width * 0.9,
                    vehicleConfig.GEOMETRY.height * 0.3,
                    0.1
                ),
                this.sharedMaterials.carWindow
            );
            frontWindow.position.set(0, vehicleConfig.GEOMETRY.height * 0.6, vehicleConfig.GEOMETRY.length * 0.4);
            vehicle.add(frontWindow);
            
            // Car wheels
            const carWheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8);
            const carWheelPositions = [
                { x: -vehicleConfig.GEOMETRY.width * 0.4, z: vehicleConfig.GEOMETRY.length * 0.3 },
                { x: vehicleConfig.GEOMETRY.width * 0.4, z: vehicleConfig.GEOMETRY.length * 0.3 },
                { x: -vehicleConfig.GEOMETRY.width * 0.4, z: -vehicleConfig.GEOMETRY.length * 0.3 },
                { x: vehicleConfig.GEOMETRY.width * 0.4, z: -vehicleConfig.GEOMETRY.length * 0.3 }
            ];
            
            carWheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(carWheelGeometry, this.sharedMaterials.carWheel);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(pos.x, 0.4, pos.z);
                vehicle.add(wheel);
            });
            
            // Car headlights
            const headlightGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 6);
            const headlightPositions = [
                { x: -vehicleConfig.GEOMETRY.width * 0.3, z: vehicleConfig.GEOMETRY.length * 0.5 },
                { x: vehicleConfig.GEOMETRY.width * 0.3, z: vehicleConfig.GEOMETRY.length * 0.5 }
            ];
            
            headlightPositions.forEach(pos => {
                const headlight = new THREE.Mesh(headlightGeometry, this.sharedMaterials.carHeadlight);
                headlight.rotation.x = Math.PI / 2;
                headlight.position.set(pos.x, vehicleConfig.GEOMETRY.height * 0.3, pos.z);
                vehicle.add(headlight);
            });
            
        } else if (type === 'TRUCK') {
            // Truck cabin
            const truckCabin = new THREE.Mesh(
                new THREE.BoxGeometry(
                    vehicleConfig.GEOMETRY.width * 0.8,
                    vehicleConfig.GEOMETRY.height * 0.4,
                    vehicleConfig.GEOMETRY.length * 0.3
                ),
                this.sharedMaterials['truckCabin']
            );
            truckCabin.position.y = vehicleConfig.GEOMETRY.height * 0.2;
            truckCabin.position.z = vehicleConfig.GEOMETRY.length * 0.35;
            truckCabin.castShadow = false;
            
            // Truck body
            const truckBody = new THREE.Mesh(
                new THREE.BoxGeometry(
                    vehicleConfig.GEOMETRY.width,
                    vehicleConfig.GEOMETRY.height * 0.6,
                    vehicleConfig.GEOMETRY.length * 0.7
                ),
                this.sharedMaterials['truckBody']
            );
            truckBody.position.y = vehicleConfig.GEOMETRY.height * 0.3;
            truckBody.position.z = -vehicleConfig.GEOMETRY.length * 0.15;
            truckBody.castShadow = false;
            
            // Wheels - simplified geometry
            const truckWheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 8); // Reduced segments
            
            const truckWheelPositions = [
                { x: -vehicleConfig.GEOMETRY.width/2 - 0.2, z: vehicleConfig.GEOMETRY.length/3 },
                { x: vehicleConfig.GEOMETRY.width/2 + 0.2, z: vehicleConfig.GEOMETRY.length/3 },
                { x: -vehicleConfig.GEOMETRY.width/2 - 0.2, z: -vehicleConfig.GEOMETRY.length/3 },
                { x: vehicleConfig.GEOMETRY.width/2 + 0.2, z: -vehicleConfig.GEOMETRY.length/3 }
            ];
            
            truckWheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(truckWheelGeometry, this.sharedMaterials['truckWheel']);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(pos.x, 0.6, pos.z);
                wheel.castShadow = false;
                vehicle.add(wheel);
            });
            
            vehicle.add(truckCabin);
            vehicle.add(truckBody);
        } else if (type === 'BUS') {
            // Bus body
            const busBody = new THREE.Mesh(
                new THREE.BoxGeometry(
                    vehicleConfig.GEOMETRY.width,
                    vehicleConfig.GEOMETRY.height * 0.8,
                    vehicleConfig.GEOMETRY.length
                ),
                this.sharedMaterials['busBody']
            );
            busBody.position.y = vehicleConfig.GEOMETRY.height * 0.4;
            busBody.castShadow = false;
            
            // Simplified bus windows (fewer windows to reduce geometry)
            const windowRows = 2; // Reduced from 3
            const windowColumns = 3; // Reduced from 4
            const windowWidth = vehicleConfig.GEOMETRY.width * 0.8;
            const windowHeight = vehicleConfig.GEOMETRY.height * 0.2;
            const windowDepth = 0.1;
            const windowSpacing = vehicleConfig.GEOMETRY.length / (windowColumns + 1);
            const windowVerticalSpacing = vehicleConfig.GEOMETRY.height * 0.6 / (windowRows + 1);
            
            for (let row = 0; row < windowRows; row++) {
                for (let col = 0; col < windowColumns; col++) {
                    const window = new THREE.Mesh(
                        new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth),
                        this.sharedMaterials['busWindow']
                    );
                    window.position.set(
                        0,
                        vehicleConfig.GEOMETRY.height * 0.2 + row * windowVerticalSpacing,
                        -vehicleConfig.GEOMETRY.length/2 + (col + 1) * windowSpacing
                    );
                    window.castShadow = false;
                    vehicle.add(window);
                }
            }
            
            // Wheels - simplified geometry
            const busWheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 8); // Reduced segments
            
            const busWheelPositions = [
                { x: -vehicleConfig.GEOMETRY.width/2 - 0.2, z: vehicleConfig.GEOMETRY.length/3 },
                { x: vehicleConfig.GEOMETRY.width/2 + 0.2, z: vehicleConfig.GEOMETRY.length/3 },
                { x: -vehicleConfig.GEOMETRY.width/2 - 0.2, z: -vehicleConfig.GEOMETRY.length/3 },
                { x: vehicleConfig.GEOMETRY.width/2 + 0.2, z: -vehicleConfig.GEOMETRY.length/3 }
            ];
            
            busWheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(busWheelGeometry, this.sharedMaterials['busWheel']);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(pos.x, 0.5, pos.z);
                wheel.castShadow = false;
                vehicle.add(wheel);
            });
            
            vehicle.add(busBody);
        }
        
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
        return this.vehicles.reduce((total, vehicle) => {
            return total + (vehicle.userData.messageHistory ? vehicle.userData.messageHistory.length : 0);
        }, 0);
    }

    // Interactive control methods
    setVehicleCount(newCount) {
        const currentCount = this.vehicles.length;
        
        if (newCount > currentCount) {
            // Add vehicles
            const vehiclesToAdd = newCount - currentCount;
            for (let i = 0; i < vehiclesToAdd; i++) {
                this.addSingleVehicle();
            }
        } else if (newCount < currentCount) {
            // Remove vehicles
            const vehiclesToRemove = currentCount - newCount;
            for (let i = 0; i < vehiclesToRemove; i++) {
                this.removeSingleVehicle();
            }
        }
        
        this.updateVehicleSummary();
        console.log(`Vehicle count changed from ${currentCount} to ${this.vehicles.length}`);
    }

    addSingleVehicle() {
        if (!this.scene) {
            console.error('Cannot add vehicle: scene not available');
            return;
        }

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
        let z = Math.random() * CONFIG.ROAD.LENGTH - CONFIG.ROAD.LENGTH / 2;
        let attempts = 0;
        const maxAttempts = 50;
        while (!this.isPositionSafe(vehicle, z, lane) && attempts < maxAttempts) {
            z = Math.random() * CONFIG.ROAD.LENGTH - CONFIG.ROAD.LENGTH / 2;
            attempts++;
        }

        vehicle.position.set(x, vehicleConfig.GEOMETRY.height / 2, z);
        
        const initialMessageType = this.assignInitialMessageType(type);
        const messageConfig = CONFIG.MESSAGE_TYPES[initialMessageType];
        
        vehicle.userData = {
            id: this.vehicles.length,
            type: type,
            speed: this.getRandomSpeed(vehicleConfig.SPEED_RANGE),
            lastPacketTime: performance.now(),
            lane: lane,
            assignedLaneX: x,
            currentNetwork: 'None',
            communicationLine: null,
            currentMessageType: initialMessageType,
            messageConfig: messageConfig,
            messageHistory: [],
            lastMessageTypeChange: performance.now(),
            messageTypeChangeInterval: 5000 + Math.random() * 10000,
            qLearningState: null,
            rewardHistory: [],
            totalReward: 0
        };
        
        this.scene.add(vehicle);
        this.vehicles.push(vehicle);
        this.laneVehicles[lane].push(vehicle);
    }

    removeSingleVehicle() {
        if (this.vehicles.length === 0) return;
        
        const vehicle = this.vehicles.pop();
        const lane = vehicle.userData.lane;
        
        // Remove from scene
        this.scene.remove(vehicle);
        
        // Remove from lane array
        const laneIndex = this.laneVehicles[lane].indexOf(vehicle);
        if (laneIndex > -1) {
            this.laneVehicles[lane].splice(laneIndex, 1);
        }
        
        // Clean up communication line if exists
        if (vehicle.userData.communicationLine) {
            this.scene.remove(vehicle.userData.communicationLine);
        }
        
        // Dispose of geometry and material
        vehicle.geometry.dispose();
        vehicle.material.dispose();
    }

    setGlobalSpeed(speedMultiplier) {
        this.vehicles.forEach(vehicle => {
            const baseSpeed = this.getRandomSpeed(CONFIG.VEHICLES.TYPES[vehicle.userData.type].SPEED_RANGE);
            vehicle.userData.speed = baseSpeed * speedMultiplier;
        });
        console.log(`Global vehicle speed multiplier set to ${speedMultiplier}`);
    }

    updateVehicleSummary() {
        this.vehicleSummary = {
            totalVehicles: this.vehicles.length,
            byType: {},
            byNetwork: {
                DSRC: 0,
                WIFI: 0,
                LTE: 0,
                None: 0
            }
        };

        this.vehicles.forEach(vehicle => {
            const type = vehicle.userData.type;
            const network = vehicle.userData.currentNetwork;
            
            this.vehicleSummary.byType[type] = (this.vehicleSummary.byType[type] || 0) + 1;
            this.vehicleSummary.byNetwork[network] = (this.vehicleSummary.byNetwork[network] || 0) + 1;
        });
    }

    getVehicleCount() {
        return this.vehicles.length;
    }
    
    submitAILearningTask(vehicle) {
        if (!this.processingManager) return;
        
        const task = {
            id: `AI_LEARNING_${vehicle.userData.id}_${Date.now()}`,
            type: 'AI_LEARNING',
            vehicleId: vehicle.userData.id,
            location: vehicle.position.clone(),
            priority: 7, // High priority for AI learning
            data: {
                vehicleState: vehicle.userData.qLearningState,
                currentNetwork: vehicle.userData.currentNetwork,
                messageType: vehicle.userData.currentMessageType,
                speed: vehicle.userData.speed,
                rewardHistory: [...vehicle.userData.rewardHistory],
                totalReward: vehicle.userData.totalReward
            },
            onComplete: (task, processorId, processingTime) => {
                console.log(`AI Learning task ${task.id} processed by ${processorId} in ${processingTime.toFixed(2)}ms`);
                
                // Update vehicle's AI learning metrics
                if (vehicle.userData) {
                    vehicle.userData.totalReward += 0.1; // Small reward for successful processing
                    vehicle.userData.rewardHistory.push({
                        timestamp: performance.now(),
                        reward: 0.1,
                        processingTime: processingTime,
                        processor: processorId
                    });
                    
                    // Keep reward history manageable
                    if (vehicle.userData.rewardHistory.length > 100) {
                        vehicle.userData.rewardHistory.shift();
                    }
                }
            }
        };
        
        const submitted = this.processingManager.submitTask(task);
        if (!submitted) {
            console.warn(`Failed to submit AI learning task for vehicle ${vehicle.userData.id}`);
        }
    }

    createSharedMaterials() {
        return {
            // Car materials
            carBody: new THREE.MeshLambertMaterial({ color: 0x1e3a8a }), // Blue
            carWindow: new THREE.MeshLambertMaterial({ color: 0x64748b, transparent: true, opacity: 0.7 }),
            carWheel: new THREE.MeshLambertMaterial({ color: 0x374151 }),
            carHeadlight: new THREE.MeshLambertMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 }),
            
            // Truck materials
            truckBody: new THREE.MeshLambertMaterial({ color: 0xdc2626 }), // Red
            truckCabin: new THREE.MeshLambertMaterial({ color: 0x991b1b }),
            truckWheel: new THREE.MeshLambertMaterial({ color: 0x374151 }),
            
            // Bus materials
            busBody: new THREE.MeshLambertMaterial({ color: 0x16a34a }), // Green
            busWindow: new THREE.MeshLambertMaterial({ color: 0x64748b, transparent: true, opacity: 0.7 }),
            busWheel: new THREE.MeshLambertMaterial({ color: 0x374151 })
        };
    }
} 