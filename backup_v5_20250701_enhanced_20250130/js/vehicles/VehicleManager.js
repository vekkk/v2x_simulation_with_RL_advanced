import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config/config.js';

export class VehicleManager {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = [];
        this.vehicleCount = 0;
        this.laneVehicles = {};
        this.networkManager = null;
        this.processingManager = null;
        this.handoverCount = 0;
        this.currentTrafficLightStates = null; // Store current traffic light states
        
        // Multi-road network support
        this.roadNetwork = {
            horizontal: [
                { id: 'h1', y: 0, z: -80, direction: 'east' },   // Bottom horizontal road
                { id: 'h2', y: 0, z: 0, direction: 'east' },     // Middle horizontal road  
                { id: 'h3', y: 0, z: 80, direction: 'east' }     // Top horizontal road
            ],
            vertical: [
                { id: 'v1', y: 0, x: -80, direction: 'north' },  // Left vertical road
                { id: 'v2', y: 0, x: 0, direction: 'north' },    // Middle vertical road
                { id: 'v3', y: 0, x: 80, direction: 'north' }    // Right vertical road
            ]
        };
        
        // Vehicle spawning system
        this.spawnSystem = {
            spawnRate: 2000, // milliseconds between spawns
            lastSpawnTime: 0,
            maxVehiclesPerRoad: 6,
            spawnPoints: this.calculateSpawnPoints()
        };
        
        // Traffic light awareness
        this.trafficLightController = null;
        
        // Initialize lane tracking for all roads
        this.initializeLaneTracking();
        
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
        
        console.log('🚗 VehicleManager initialized with multi-road support');
    }

    calculateSpawnPoints() {
        const spawnPoints = [];
        const roadLength = CONFIG.ROAD.LENGTH;
        
        // Horizontal roads - spawn from left and right edges
        this.roadNetwork.horizontal.forEach(road => {
            // Left edge spawn (vehicles moving east/right)
            spawnPoints.push({
                roadId: road.id,
                roadType: 'horizontal',
                position: { x: -roadLength/2 - 10, y: road.y, z: road.z },
                direction: { x: 1, z: 0 }, // Moving east
                roadData: road
            });
            
            // Right edge spawn (vehicles moving west/left) 
            spawnPoints.push({
                roadId: road.id + '_reverse',
                roadType: 'horizontal',
                position: { x: roadLength/2 + 10, y: road.y, z: road.z },
                direction: { x: -1, z: 0 }, // Moving west
                roadData: road
            });
        });
        
        // Vertical roads - spawn from top and bottom edges
        this.roadNetwork.vertical.forEach(road => {
            // Bottom edge spawn (vehicles moving north/up)
            spawnPoints.push({
                roadId: road.id,
                roadType: 'vertical',
                position: { x: road.x, y: road.y, z: -roadLength/2 - 10 },
                direction: { x: 0, z: 1 }, // Moving north
                roadData: road
            });
            
            // Top edge spawn (vehicles moving south/down)
            spawnPoints.push({
                roadId: road.id + '_reverse', 
                roadType: 'vertical',
                position: { x: road.x, y: road.y, z: roadLength/2 + 10 },
                direction: { x: 0, z: -1 }, // Moving south
                roadData: road
            });
        });
        
        return spawnPoints;
    }

    initializeLaneTracking() {
        // Initialize lane tracking for all roads and directions
        const totalLanes = this.spawnSystem.spawnPoints.length * CONFIG.ROAD.NUM_LANES;
        for (let i = 0; i < totalLanes; i++) {
            this.laneVehicles[i] = [];
        }
    }

    setTrafficLightController(controller) {
        this.trafficLightController = controller;
        console.log('🚦 Traffic light controller set in VehicleManager');
    }

    initializeVehicles() {
        // Create shared materials once to avoid WebGL texture limits
        this.sharedMaterials = this.createSharedMaterials();
        
        // Create initial vehicles
        this.createVehicles();
        
        console.log('🚗 VehicleManager vehicles initialized');
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
        // Start with fewer initial vehicles, more will spawn naturally
        const initialVehicles = Math.min(CONFIG.VEHICLES.NUM_VEHICLES, 12);
        
        for (let i = 0; i < initialVehicles; i++) {
            this.spawnVehicleNaturally();
        }
        
        console.log(`🚗 Created ${initialVehicles} initial vehicles, more will spawn naturally`);
    }

    spawnVehicleNaturally() {
        // Select random spawn point
        const spawnPoint = this.spawnSystem.spawnPoints[
            Math.floor(Math.random() * this.spawnSystem.spawnPoints.length)
        ];
        
        // Check if this road already has too many vehicles
        const vehiclesOnRoad = this.countVehiclesOnRoad(spawnPoint.roadId);
        if (vehiclesOnRoad >= this.spawnSystem.maxVehiclesPerRoad) {
            return null; // Skip spawning
        }
        
        // Create vehicle
        const typesArray = Object.keys(CONFIG.VEHICLES.TYPES);
        const type = typesArray[Math.floor(Math.random() * typesArray.length)];
        const vehicleConfig = CONFIG.VEHICLES.TYPES[type];
        
        const vehicle = this.createVehicle(type);
        vehicle.castShadow = false;
        
        // Select random lane
        const lane = Math.floor(Math.random() * CONFIG.ROAD.NUM_LANES);
        const laneOffset = this.calculateLanePosition(lane, spawnPoint.roadType);
        
        // Position vehicle at spawn point with lane offset
        let spawnX = spawnPoint.position.x;
        let spawnZ = spawnPoint.position.z;
        
        if (spawnPoint.roadType === 'horizontal') {
            spawnZ += laneOffset;
        } else {
            spawnX += laneOffset;
        }
        
        // Set vehicle direction based on spawn point
        const direction = spawnPoint.direction;
        if (direction.x < 0 || direction.z < 0) {
            vehicle.rotation.y = Math.PI; // Face opposite direction
        }
        
        // Set proper rotation based on road type and direction (add π/2 to fix orientation)
        if (spawnPoint.roadType === 'horizontal') {
            // Horizontal roads: π/2 for east (right), 3π/2 for west (left)
            vehicle.rotation.y = direction.x > 0 ? Math.PI/2 : -Math.PI/2;
        } else {
            // Vertical roads: 0 for north (up), π for south (down)
            vehicle.rotation.y = direction.z > 0 ? 0 : Math.PI;
        }
        
        // Position vehicle at spawn point with lane offset
        vehicle.position.set(
            spawnX,
            vehicleConfig.GEOMETRY.height / 2 + 0.1,
            spawnZ
        );
        
        // Assign vehicle data
        const initialMessageType = this.assignInitialMessageType(type);
        const globalLaneId = this.getGlobalLaneId(spawnPoint.roadId, lane);
        
        vehicle.userData = {
            id: this.vehicleCount++,
            type: type,
            speed: this.getRandomSpeed(vehicleConfig.SPEED_RANGE),
            lastPacketTime: performance.now(),
            lane: globalLaneId,
            roadId: spawnPoint.roadId,
            roadType: spawnPoint.roadType,
            direction: direction,
            assignedLaneX: spawnX,
            assignedLaneZ: spawnZ,
            currentNetwork: 'None',
            communicationLine: null,
            // Traffic control
            stoppedAtTrafficLight: false,
            approachingIntersection: null,
            // Message type related properties
            currentMessageType: initialMessageType,
            messageConfig: CONFIG.MESSAGE_TYPES[initialMessageType],
            messageHistory: [],
            lastMessageTypeChange: performance.now(),
            messageTypeChangeInterval: 5000 + Math.random() * 10000,
            // AI learning related properties
            qLearningState: null,
            rewardHistory: [],
            totalReward: 0
        };
        
        this.scene.add(vehicle);
        this.vehicles.push(vehicle);
        this.laneVehicles[globalLaneId].push(vehicle);
        
        // Update summary
        this.vehicleSummary.totalVehicles++;
        this.vehicleSummary.byType[type] = (this.vehicleSummary.byType[type] || 0) + 1;
        
        console.log(`🚗 Spawned ${type} on road ${spawnPoint.roadId} lane ${lane}`);
        return vehicle;
    }

    calculateLanePosition(laneIndex, roadType) {
        const totalRoadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const laneStart = -totalRoadWidth / 2 + CONFIG.ROAD.LANE_WIDTH / 2;
        return laneStart + laneIndex * CONFIG.ROAD.LANE_WIDTH;
    }

    getGlobalLaneId(roadId, localLaneIndex) {
        // Create unique lane ID across all roads
        const roadIndex = this.spawnSystem.spawnPoints.findIndex(sp => sp.roadId === roadId);
        return roadIndex * CONFIG.ROAD.NUM_LANES + localLaneIndex;
    }

    countVehiclesOnRoad(roadId) {
        return this.vehicles.filter(vehicle => 
            vehicle.userData.roadId === roadId
        ).length;
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

    updateMessageTypes() {
        this.vehicles.forEach(vehicle => {
            // Check if it's time to potentially change message type
            if (performance.now() - vehicle.userData.lastMessageTypeChange >= vehicle.userData.messageTypeChangeInterval) {
                // Use AI to determine if message type should change
                if (this.networkManager && this.networkManager.ai) {
                    const newMessageType = this.networkManager.ai.generateMessageType(vehicle);
                    if (newMessageType !== vehicle.userData.currentMessageType) {
                        this.changeVehicleMessageType(vehicle, newMessageType);
                        vehicle.userData.lastMessageTypeChange = performance.now();
                        // Randomize next change interval
                        vehicle.userData.messageTypeChangeInterval = 5000 + Math.random() * 10000;
                    }
                } else {
                    // Fallback: random message type change
                    if (Math.random() < 0.1) { // 10% chance to change
                        const messageTypes = Object.keys(CONFIG.MESSAGE_TYPES);
                        const newType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
                        this.changeVehicleMessageType(vehicle, newType);
                        vehicle.userData.lastMessageTypeChange = performance.now();
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

    updatePositions(deltaTime) {
        // Convert deltaTime to seconds for proper speed calculations
        const deltaTimeSeconds = deltaTime / 1000;
        
        // Update message types if network manager is available
        if (this.networkManager) {
            this.updateMessageTypes();
        }
        
        // Check for natural spawning
        this.checkNaturalSpawning(deltaTime);
        
        // Process vehicles directly without complex sorting
        this.vehicles.forEach(vehicle => {
            // Safety check for valid vehicle
            if (!vehicle || !vehicle.position || !vehicle.userData) {
                console.warn('⚠️ Invalid vehicle detected, skipping');
                return;
            }
            
            const userData = vehicle.userData;
            
            // Check traffic light status - this method now handles all traffic light logic internally
            this.checkTrafficLightStatus(vehicle);
            
            // Skip movement if vehicle is stopped at traffic light
            if (vehicle.userData.stoppedAtTrafficLight) {
                // Only log occasionally to reduce spam
                if (Math.random() < 0.01) {
                    console.log(`🛑 Vehicle ${vehicle.userData.id} is stopped at traffic light`);
                }
                return;
            }
            
            // Calculate proposed new position based on road type and direction
            let proposedX = vehicle.position.x;
            let proposedZ = vehicle.position.z;
            
            if (userData.roadType === 'horizontal') {
                proposedX += userData.direction.x * userData.speed * deltaTimeSeconds;
            } else {
                proposedZ += userData.direction.z * userData.speed * deltaTimeSeconds;
            }
            
            // Check for collisions with other vehicles
            const collision = this.checkCollision(vehicle, proposedX, proposedZ);
            
            if (!collision) {
                // No collision - move normally
                vehicle.position.x = proposedX;
                vehicle.position.z = proposedZ;
                
                // Gradually restore normal speed if it was reduced
                if (userData.speed < userData.originalSpeed) {
                    userData.speed = Math.min(userData.speed * 1.02, userData.originalSpeed);
                }
                
                // Check if vehicle has gone off-screen and needs respawning
                if (this.isVehicleOffScreen(vehicle)) {
                    this.respawnVehicle(vehicle);
                }
            } else {
                // Collision detected - handle it properly
                const originalConfig = CONFIG.VEHICLES.TYPES[userData.type];
                const maxSpeed = this.getRandomSpeed(originalConfig.SPEED_RANGE);
                
                // Store original speed if not already stored
                if (!userData.originalSpeed) {
                    userData.originalSpeed = userData.speed;
                }
                
                // Reduce speed significantly to create proper spacing
                userData.speed = Math.max(userData.speed * 0.3, 0.5); // Slow down more aggressively
                
                // Try to move with much reduced speed
                const moveDistance = userData.speed * deltaTimeSeconds * 0.2; // Very small movement
                let reducedX = vehicle.position.x;
                let reducedZ = vehicle.position.z;
                
                if (userData.roadType === 'horizontal') {
                    reducedX += userData.direction.x * moveDistance;
                } else {
                    reducedZ += userData.direction.z * moveDistance;
                }
                
                // Only move if the reduced movement is completely safe
                if (!this.checkCollision(vehicle, reducedX, reducedZ)) {
                    vehicle.position.x = reducedX;
                    vehicle.position.z = reducedZ;
                } else {
                    // Complete stop if even tiny movement would cause collision
                    userData.speed = 0.1; // Almost stopped
                }
                
                // Set a timeout to gradually restore speed
                if (!userData.speedRestoreTimeout) {
                    userData.speedRestoreTimeout = setTimeout(() => {
                        if (userData.speed < maxSpeed) {
                            userData.speed = Math.min(userData.speed * 1.5, maxSpeed);
                        }
                        userData.speedRestoreTimeout = null;
                    }, 2000 + Math.random() * 1000); // Random delay to prevent synchronized movement
                }
            }
            
            // Update AI state for reinforcement learning
            if (this.processingManager) {
                this.updateAIState(vehicle, deltaTime);
                
                // Submit learning task periodically
                if (Math.random() < 0.01) { // 1% chance per frame
                    this.processingManager.submitTask({
                        vehicleId: userData.id,
                        state: userData.qLearningState,
                        action: 'move',
                        reward: this.calculateReward(vehicle),
                        timestamp: performance.now()
                    });
                }
            }
        });
    }

    checkNaturalSpawning(deltaTime) {
        const currentTime = performance.now();
        
        if (currentTime - this.spawnSystem.lastSpawnTime > this.spawnSystem.spawnRate) {
            // Only spawn if we haven't reached the maximum
            if (this.vehicles.length < CONFIG.VEHICLES.NUM_VEHICLES) {
                this.spawnVehicleNaturally();
                this.spawnSystem.lastSpawnTime = currentTime;
            }
        }
    }

    checkTrafficLightStatus(vehicle) {
        // Simplified traffic light system - just basic intersection detection
        if (!this.currentTrafficLightStates) {
            // No traffic lights - vehicles can move freely
            if (vehicle.userData.stoppedAtTrafficLight) {
                vehicle.userData.stoppedAtTrafficLight = false;
                console.log(`✅ Vehicle ${vehicle.userData.id} cleared - no traffic lights`);
            }
            return;
        }

        // Simple intersection detection - check if vehicle is near center (intersection area)
        const vehicleX = vehicle.position.x;
        const vehicleZ = vehicle.position.z;
        const intersectionSize = 30; // Larger detection area
        
        // Check if vehicle is in intersection area (near center 0,0)
        const distanceToCenter = Math.sqrt(vehicleX * vehicleX + vehicleZ * vehicleZ);
        const isNearIntersection = distanceToCenter < intersectionSize;
        
        if (!isNearIntersection) {
            // Vehicle is far from intersection - clear any stopped state
            if (vehicle.userData.stoppedAtTrafficLight) {
                vehicle.userData.stoppedAtTrafficLight = false;
                console.log(`✅ Vehicle ${vehicle.userData.id} cleared from intersection area`);
            }
            return;
        }

        // Vehicle is near intersection - simple traffic light logic
        // For simplicity, let's use a basic timer-based system
        const currentTime = Date.now();
        const cycleTime = 10000; // 10 second cycle
        const greenTime = 6000;   // 6 seconds green
        const yellowTime = 2000;  // 2 seconds yellow
        // 2 seconds red (remaining time)
        
        const timeInCycle = currentTime % cycleTime;
        let lightState = 'red';
        
        if (timeInCycle < greenTime) {
            lightState = 'green';
        } else if (timeInCycle < greenTime + yellowTime) {
            lightState = 'yellow';
        }
        
        // Simple stopping logic
        if (lightState === 'red' || lightState === 'yellow') {
            // Stop if approaching intersection and light is not green
            const approachDistance = 15; // Distance at which to stop
            if (distanceToCenter > approachDistance && !vehicle.userData.stoppedAtTrafficLight) {
                vehicle.userData.stoppedAtTrafficLight = true;
                console.log(`🛑 Vehicle ${vehicle.userData.id} STOPPED for ${lightState} light`);
            }
        } else if (lightState === 'green') {
            // Green light - proceed
            if (vehicle.userData.stoppedAtTrafficLight) {
                vehicle.userData.stoppedAtTrafficLight = false;
                console.log(`🟢 Vehicle ${vehicle.userData.id} PROCEEDING on green light`);
            }
        }
        
        // Force clear stuck vehicles periodically
        if (vehicle.userData.stoppedAtTrafficLight && Math.random() < 0.01) {
            vehicle.userData.stoppedAtTrafficLight = false;
            console.log(`🔧 Force cleared potentially stuck vehicle ${vehicle.userData.id}`);
        }
    }

    checkCollision(vehicle, proposedX, proposedZ) {
        const userData = vehicle.userData;
        const vehicleConfig = CONFIG.VEHICLES.TYPES[userData.type];
        const vehicleLength = vehicleConfig.GEOMETRY.length;
        
        // Simplified collision detection - only check vehicles in same lane and direction
        for (const otherVehicle of this.vehicles) {
            if (otherVehicle === vehicle) continue;
            
            const otherData = otherVehicle.userData;
            
            // Only check collision with vehicles in same lane and same direction
            if (userData.lane !== otherData.lane) continue;
            if (!this.isSameDirection(userData.direction, otherData.direction)) continue;
            
            const distance = this.calculateDistance(
                proposedX, proposedZ,
                otherVehicle.position.x, otherVehicle.position.z
            );
            
            // Simple distance check - much more lenient
            const minDistance = vehicleLength + 2; // Reduced safety margin
            
            if (distance < minDistance) {
                // Check if we're behind the other vehicle
                const isBehind = this.isVehicleBehind(
                    {x: proposedX, z: proposedZ}, 
                    otherVehicle.position, 
                    userData.direction
                );
                
                if (isBehind) {
                    return true; // Collision detected
                }
            }
        }
        
        return false; // No collision
    }
    
    // Helper method to check if position is in intersection area
    isInIntersectionArea(x, z) {
        // Check if position is near any intersection
        if (!this.trafficLightController) return false;
        
        const intersections = this.trafficLightController.intersections;
        const intersectionSize = 20; // Size of intersection area
        
        for (const [id, intersection] of intersections) {
            const distanceToIntersection = Math.sqrt(
                Math.pow(x - intersection.position.x, 2) + 
                Math.pow(z - intersection.position.z, 2)
            );
            
            if (distanceToIntersection < intersectionSize) {
                return true;
            }
        }
        
        return false;
    }

    calculateDistance(x1, z1, x2, z2) {
        return Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    }

    isSameDirection(dir1, dir2) {
        const threshold = 0.5;
        return Math.abs(dir1.x - dir2.x) < threshold && Math.abs(dir1.z - dir2.z) < threshold;
    }

    isVehicleBehind(pos1, pos2, direction) {
        // Calculate if vehicle at pos1 is behind vehicle at pos2 in the given direction
        const dx = pos2.x - pos1.x;
        const dz = pos2.z - pos1.z;
        
        // Dot product with direction vector
        const dotProduct = dx * direction.x + dz * direction.z;
        
        return dotProduct > 0; // Positive means pos2 is in front of pos1
    }

    isVehicleOffScreen(vehicle) {
        const position = vehicle.position;
        const boundary = CONFIG.ROAD.LENGTH / 2 + 20; // Extra buffer
        
        return Math.abs(position.x) > boundary || Math.abs(position.z) > boundary;
    }

    respawnVehicle(vehicle) {
        const userData = vehicle.userData;
        
        // Find a new spawn point, preferably different road
        const availableSpawns = this.spawnSystem.spawnPoints.filter(sp => 
            sp.roadId !== userData.roadId
        );
        
        const spawnPoint = availableSpawns.length > 0 ? 
            availableSpawns[Math.floor(Math.random() * availableSpawns.length)] :
            this.spawnSystem.spawnPoints[Math.floor(Math.random() * this.spawnSystem.spawnPoints.length)];
        
        // Remove from old lane
        const oldLaneVehicles = this.laneVehicles[userData.lane];
        const index = oldLaneVehicles.indexOf(vehicle);
        if (index > -1) {
            oldLaneVehicles.splice(index, 1);
        }
        
        // Select new lane and position
        const lane = Math.floor(Math.random() * CONFIG.ROAD.NUM_LANES);
        const laneOffset = this.calculateLanePosition(lane, spawnPoint.roadType);
        const globalLaneId = this.getGlobalLaneId(spawnPoint.roadId, lane);
        
        let spawnX = spawnPoint.position.x;
        let spawnZ = spawnPoint.position.z;
        
        if (spawnPoint.roadType === 'horizontal') {
            spawnZ += laneOffset;
        } else {
            spawnX += laneOffset;
        }
        
        // Update vehicle position and data
        vehicle.position.set(spawnX, vehicle.position.y, spawnZ);
        
        // Set vehicle direction
        const direction = spawnPoint.direction;
        if (direction.x < 0 || direction.z < 0) {
            vehicle.rotation.y = Math.PI;
        } else {
            vehicle.rotation.y = 0;
        }
        
        // Set proper rotation based on road type and direction (add π/2 to fix orientation)
        if (spawnPoint.roadType === 'horizontal') {
            // Horizontal roads: π/2 for east (right), 3π/2 for west (left)
            vehicle.rotation.y = direction.x > 0 ? Math.PI/2 : -Math.PI/2;
        } else {
            // Vertical roads: 0 for north (up), π for south (down)
            vehicle.rotation.y = direction.z > 0 ? 0 : Math.PI;
        }
        
        // Update vehicle data
        userData.roadId = spawnPoint.roadId;
        userData.roadType = spawnPoint.roadType;
        userData.direction = direction;
        userData.lane = globalLaneId;
        userData.assignedLaneX = spawnX;
        userData.assignedLaneZ = spawnZ;
        userData.stoppedAtTrafficLight = false;
        userData.approachingIntersection = null;
        
        // Add to new lane
        this.laneVehicles[globalLaneId].push(vehicle);
        
        // Update message type
        userData.currentMessageType = this.assignInitialMessageType(userData.type);
        userData.messageConfig = CONFIG.MESSAGE_TYPES[userData.currentMessageType];
        
        console.log(`🔄 Respawned vehicle ${userData.id} on road ${spawnPoint.roadId}`);
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

    updateAIState(vehicle, deltaTime) {
        // Update AI state for reinforcement learning
        if (this.networkManager && this.networkManager.ai) {
            vehicle.userData.qLearningState = this.networkManager.ai.createState(vehicle);
        }
    }

    calculateReward(vehicle) {
        // Calculate reward based on vehicle behavior
        let reward = 0;
        
        // Reward for maintaining speed
        const targetSpeed = CONFIG.VEHICLES.TYPES[vehicle.userData.type].SPEED_RANGE.max * 0.8;
        const speedRatio = vehicle.userData.speed / targetSpeed;
        reward += speedRatio * 10;
        
        // Penalty for stopping at traffic lights (but necessary)
        if (vehicle.userData.stoppedAtTrafficLight) {
            reward -= 2; // Small penalty
        }
        
        // Reward for successful communication
        if (vehicle.userData.currentNetwork !== 'None') {
            reward += 5;
        }
        
        return reward;
    }

    // Method to receive traffic light state updates
    updateTrafficLights(trafficLightStates) {
        this.currentTrafficLightStates = trafficLightStates;
        // Optional: Log traffic light state changes for debugging
        if (Math.random() < 0.01) { // Log occasionally to avoid spam
            console.log('🚦 Traffic light states updated:', trafficLightStates);
        }
    }

    getApproachDirection(vehicle, intersectionPosition) {
        // Calculate the vector from intersection to vehicle
        const dx = vehicle.position.x - intersectionPosition.x;
        const dz = vehicle.position.z - intersectionPosition.z;
        
        // Determine which direction the vehicle is approaching from based on position
        // and movement direction
        const absX = Math.abs(dx);
        const absZ = Math.abs(dz);
        
        if (absX > absZ) {
            // Vehicle is more to the east or west of intersection
            if (dx > 0) {
                return 'east';  // Vehicle is east of intersection, approaching from east
            } else {
                return 'west';  // Vehicle is west of intersection, approaching from west
            }
        } else {
            // Vehicle is more to the north or south of intersection
            if (dz > 0) {
                return 'south'; // Vehicle is south of intersection, approaching from south
            } else {
                return 'north'; // Vehicle is north of intersection, approaching from north
            }
        }
    }
} 