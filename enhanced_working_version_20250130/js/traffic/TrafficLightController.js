import { CONFIG } from '../config/config.js';

export class TrafficLightController {
    constructor() {
        this.intersections = new Map();
        this.globalTrafficState = {
            totalVehicles: 0,
            averageSpeed: 0,
            congestionLevel: 0,
            emergencyMode: false
        };
        
        // AI optimization parameters
        this.optimizationEnabled = true;
        this.learningRate = 0.1;
        this.adaptiveTimingEnabled = true;
        
        // Performance tracking
        this.performanceMetrics = {
            totalWaitTime: 0,
            averageWaitTime: 0,
            throughput: 0,
            fuelConsumption: 0,
            emissions: 0
        };
        
        // Emergency vehicle detection
        this.emergencyVehicles = new Set();
        this.emergencyOverride = false;
        
        console.log('🚦 Traffic Light Controller initialized');
    }
    
    // Initialize traffic lights at intersections
    initializeIntersections(intersectionData) {
        intersectionData.forEach(intersection => {
            this.createIntersection(
                intersection.id,
                intersection.position,
                intersection.directions,
                intersection.timing
            );
        });
        
        // Set up coordination between intersections
        this.setupIntersectionCoordination();
        
        console.log(`🚦 Initialized ${this.intersections.size} intersections`);
    }
    
    // Create a single intersection
    createIntersection(id, position, directions, initialTiming) {
        const intersection = {
            id: id,
            position: position,
            directions: directions, // ['north', 'south', 'east', 'west']
            
            // Traffic light states for each direction
            lights: {},
            
            // Timing configuration
            timing: {
                greenTime: initialTiming?.greenTime || 30000, // 30 seconds
                yellowTime: initialTiming?.yellowTime || 3000, // 3 seconds
                redTime: initialTiming?.redTime || 2000, // 2 seconds all-red
                cycleTime: 0 // Will be calculated
            },
            
            // Current state
            currentPhase: 0,
            phaseStartTime: Date.now(),
            allRedPhase: false, // Track all-red phase
            
            // Vehicle detection
            vehicleQueues: {},
            detectedVehicles: new Set(),
            
            // Performance metrics
            metrics: {
                vehiclesPassed: 0,
                totalWaitTime: 0,
                averageWaitTime: 0,
                cycleCount: 0,
                efficiency: 1.0
            },
            
            // AI learning parameters
            qTable: new Map(),
            lastState: null,
            lastAction: null,
            lastReward: 0,
            
            // Emergency handling
            emergencyOverride: false,
            emergencyDirection: null
        };
        
        // Initialize lights for each direction
        directions.forEach(direction => {
            intersection.lights[direction] = {
                state: 'red', // 'red', 'yellow', 'green'
                intensity: 0.5, // For visual effects
                lastChange: Date.now()
            };
            
            intersection.vehicleQueues[direction] = [];
        });
        
        // Calculate total cycle time
        intersection.timing.cycleTime = 
            intersection.timing.greenTime * directions.length + 
            intersection.timing.yellowTime * directions.length + 
            intersection.timing.redTime;
        
        // Set up initial phase (typically north-south green)
        this.setIntersectionPhase(intersection, 0);
        
        this.intersections.set(id, intersection);
        
        console.log(`🚦 Created intersection ${id} at position:`, position);
    }
    
    // Set traffic light phase for an intersection
    setIntersectionPhase(intersection, phaseIndex) {
        const directions = intersection.directions;
        const totalPhases = directions.length;
        
        // Reset all lights to red first
        Object.keys(intersection.lights).forEach(direction => {
            intersection.lights[direction].state = 'red';
            intersection.lights[direction].lastChange = Date.now();
        });
        
        // Set current phase direction to green
        const currentDirection = directions[phaseIndex % totalPhases];
        const oppositeDirection = this.getOppositeDirection(currentDirection);
        
        // Green for current direction and opposite (if exists)
        intersection.lights[currentDirection].state = 'green';
        if (oppositeDirection && intersection.lights[oppositeDirection]) {
            intersection.lights[oppositeDirection].state = 'green';
        }
        
        intersection.currentPhase = phaseIndex % totalPhases;
        intersection.phaseStartTime = Date.now();
        
        console.log(`🚦 Intersection ${intersection.id}: Phase ${intersection.currentPhase} - ${currentDirection} GREEN`);
    }
    
    // Get opposite direction for simultaneous green lights
    getOppositeDirection(direction) {
        const opposites = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east'
        };
        return opposites[direction];
    }
    
    // Main update method called every frame
    update(vehicles, deltaTime) {
        const currentTime = Date.now();
        
        // Update global traffic state
        this.updateGlobalTrafficState(vehicles);
        
        // Update each intersection
        this.intersections.forEach(intersection => {
            this.updateIntersection(intersection, vehicles, currentTime);
        });
        
        // Handle emergency vehicles
        this.handleEmergencyVehicles(vehicles);
        
        // Update performance metrics
        this.updatePerformanceMetrics();
        
        // AI optimization (if enabled)
        if (this.optimizationEnabled) {
            this.optimizeTrafficFlow();
        }
    }
    
    // Update a single intersection
    updateIntersection(intersection, vehicles, currentTime) {
        const timeSincePhaseStart = currentTime - intersection.phaseStartTime;
        const currentTiming = intersection.timing;
        
        // Detect vehicles at intersection
        this.detectVehiclesAtIntersection(intersection, vehicles);
        
        // Handle emergency override
        if (intersection.emergencyOverride) {
            this.handleEmergencyAtIntersection(intersection, currentTime);
            return;
        }
        
        // Normal traffic light cycle
        const currentDirection = intersection.directions[intersection.currentPhase];
        const currentLight = intersection.lights[currentDirection];
        
        // Phase timing logic - Fixed to prevent rapid switching
        if (currentLight.state === 'green') {
            // Check if minimum green time has elapsed
            const minGreenTime = Math.max(currentTiming.greenTime, 15000); // Ensure minimum 15 seconds
            const shouldChangePhase = timeSincePhaseStart >= minGreenTime ||
                                    (this.adaptiveTimingEnabled && 
                                     timeSincePhaseStart >= 10000 && // Minimum 10 seconds before adaptive
                                     this.shouldChangePhase(intersection));
            
            if (shouldChangePhase) {
                // Change to yellow
                this.setLightState(intersection, currentDirection, 'yellow');
                const oppositeDirection = this.getOppositeDirection(currentDirection);
                if (oppositeDirection && intersection.lights[oppositeDirection]) {
                    this.setLightState(intersection, oppositeDirection, 'yellow');
                }
                
                // Update phase start time for yellow phase
                intersection.phaseStartTime = currentTime;
            }
        } else if (currentLight.state === 'yellow') {
            // Yellow phase duration
            if (timeSincePhaseStart >= currentTiming.yellowTime) {
                // Change to red and prepare for next phase
                this.setLightState(intersection, currentDirection, 'red');
                const oppositeDirection = this.getOppositeDirection(currentDirection);
                if (oppositeDirection && intersection.lights[oppositeDirection]) {
                    this.setLightState(intersection, oppositeDirection, 'red');
                }
                
                // Start all-red phase
                intersection.phaseStartTime = currentTime;
                intersection.allRedPhase = true;
            }
        } else if (intersection.allRedPhase) {
            // All-red phase before switching to next direction
            if (timeSincePhaseStart >= currentTiming.redTime) {
                // Move to next phase
                const nextPhase = (intersection.currentPhase + 1) % intersection.directions.length;
                this.setIntersectionPhase(intersection, nextPhase);
                intersection.allRedPhase = false;
                intersection.metrics.cycleCount++;
            }
        }
        
        // Update vehicle queues and calculate metrics
        this.updateVehicleQueues(intersection, vehicles);
        this.calculateIntersectionMetrics(intersection);
    }
    
    // Set light state for a specific direction
    setLightState(intersection, direction, state) {
        if (intersection.lights[direction]) {
            intersection.lights[direction].state = state;
            intersection.lights[direction].lastChange = Date.now();
            intersection.lights[direction].intensity = state === 'green' ? 1.0 : 0.5;
        }
    }
    
    // Detect vehicles near intersection
    detectVehiclesAtIntersection(intersection, vehicles) {
        const detectionRange = 50; // meters
        intersection.detectedVehicles.clear();
        
        // Clear previous vehicle queues
        Object.keys(intersection.vehicleQueues).forEach(direction => {
            intersection.vehicleQueues[direction] = [];
        });
        
        vehicles.forEach(vehicle => {
            const distance = this.calculateDistance(vehicle.position, intersection.position);
            
            if (distance <= detectionRange) {
                intersection.detectedVehicles.add(vehicle.id);
                
                // Determine which direction the vehicle is approaching from
                const approachDirection = this.getVehicleApproachDirection(vehicle, intersection);
                if (approachDirection && intersection.vehicleQueues[approachDirection]) {
                    intersection.vehicleQueues[approachDirection].push({
                        vehicleId: vehicle.id,
                        distance: distance,
                        speed: vehicle.speed || 0,
                        waitTime: vehicle.waitTime || 0,
                        priority: vehicle.priority || 'normal'
                    });
                }
            }
        });
        
        // Sort vehicle queues by distance (closest first)
        Object.keys(intersection.vehicleQueues).forEach(direction => {
            intersection.vehicleQueues[direction].sort((a, b) => a.distance - b.distance);
        });
    }
    
    // Determine vehicle approach direction
    getVehicleApproachDirection(vehicle, intersection) {
        const dx = vehicle.position.x - intersection.position.x;
        const dz = vehicle.position.z - intersection.position.z;
        
        // Simple direction determination based on position
        if (Math.abs(dx) > Math.abs(dz)) {
            return dx > 0 ? 'west' : 'east';
        } else {
            return dz > 0 ? 'north' : 'south';
        }
    }
    
    // Calculate distance between two points
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // Adaptive timing decision
    shouldChangePhase(intersection) {
        const currentDirection = intersection.directions[intersection.currentPhase];
        const currentQueue = intersection.vehicleQueues[currentDirection];
        const oppositeDirection = this.getOppositeDirection(currentDirection);
        const oppositeQueue = intersection.vehicleQueues[oppositeDirection] || [];
        
        // Check if current direction queue is empty or very small
        const currentQueueSize = currentQueue.length + oppositeQueue.length;
        
        // Check other directions for waiting vehicles
        let maxWaitingQueue = 0;
        intersection.directions.forEach(direction => {
            if (direction !== currentDirection && direction !== oppositeDirection) {
                const queueSize = intersection.vehicleQueues[direction]?.length || 0;
                maxWaitingQueue = Math.max(maxWaitingQueue, queueSize);
            }
        });
        
        // Change phase if current queue is empty and others are waiting
        return currentQueueSize === 0 && maxWaitingQueue > 2;
    }
    
    // Update vehicle queues and waiting times
    updateVehicleQueues(intersection, vehicles) {
        Object.keys(intersection.vehicleQueues).forEach(direction => {
            const queue = intersection.vehicleQueues[direction];
            const lightState = intersection.lights[direction]?.state;
            
            queue.forEach(queuedVehicle => {
                // Find the actual vehicle object
                const vehicle = vehicles.find(v => v.id === queuedVehicle.vehicleId);
                if (vehicle) {
                    // Update wait time if stopped at red light
                    if (lightState === 'red' && vehicle.speed < 1) {
                        vehicle.waitTime = (vehicle.waitTime || 0) + 16; // Assuming 60fps
                        queuedVehicle.waitTime = vehicle.waitTime;
                    } else if (lightState === 'green') {
                        // Reset wait time when light turns green
                        vehicle.waitTime = 0;
                        queuedVehicle.waitTime = 0;
                    }
                }
            });
        });
    }
    
    // Calculate intersection performance metrics
    calculateIntersectionMetrics(intersection) {
        let totalWaitTime = 0;
        let totalVehicles = 0;
        
        Object.values(intersection.vehicleQueues).forEach(queue => {
            queue.forEach(vehicle => {
                totalWaitTime += vehicle.waitTime;
                totalVehicles++;
            });
        });
        
        if (totalVehicles > 0) {
            intersection.metrics.averageWaitTime = totalWaitTime / totalVehicles;
            intersection.metrics.totalWaitTime += totalWaitTime;
        }
        
        // Calculate efficiency based on wait times and throughput
        const idealWaitTime = intersection.timing.cycleTime / 4; // Ideal average wait
        intersection.metrics.efficiency = Math.max(0, 1 - (intersection.metrics.averageWaitTime / idealWaitTime));
    }
    
    // Handle emergency vehicles
    handleEmergencyVehicles(vehicles) {
        const emergencyVehicles = vehicles.filter(v => v.priority === 'emergency');
        
        emergencyVehicles.forEach(emergencyVehicle => {
            // Find nearest intersection
            let nearestIntersection = null;
            let minDistance = Infinity;
            
            this.intersections.forEach(intersection => {
                const distance = this.calculateDistance(emergencyVehicle.position, intersection.position);
                if (distance < minDistance && distance < 100) { // Within 100 meters
                    minDistance = distance;
                    nearestIntersection = intersection;
                }
            });
            
            if (nearestIntersection) {
                this.activateEmergencyMode(nearestIntersection, emergencyVehicle);
            }
        });
    }
    
    // Activate emergency mode for an intersection
    activateEmergencyMode(intersection, emergencyVehicle) {
        if (!intersection.emergencyOverride) {
            console.log(`🚨 Emergency mode activated at intersection ${intersection.id}`);
            
            intersection.emergencyOverride = true;
            intersection.emergencyDirection = this.getVehicleApproachDirection(emergencyVehicle, intersection);
            
            // Immediately set emergency direction to green
            const emergencyDir = intersection.emergencyDirection;
            const oppositeDir = this.getOppositeDirection(emergencyDir);
            
            // Set all lights to red first
            Object.keys(intersection.lights).forEach(direction => {
                intersection.lights[direction].state = 'red';
            });
            
            // Set emergency path to green
            intersection.lights[emergencyDir].state = 'green';
            if (oppositeDir && intersection.lights[oppositeDir]) {
                intersection.lights[oppositeDir].state = 'green';
            }
            
            // Schedule return to normal operation
            setTimeout(() => {
                this.deactivateEmergencyMode(intersection);
            }, 15000); // 15 seconds emergency override
        }
    }
    
    // Deactivate emergency mode
    deactivateEmergencyMode(intersection) {
        console.log(`🚦 Emergency mode deactivated at intersection ${intersection.id}`);
        
        intersection.emergencyOverride = false;
        intersection.emergencyDirection = null;
        
        // Resume normal operation
        this.setIntersectionPhase(intersection, 0);
    }
    
    // AI optimization of traffic flow
    optimizeTrafficFlow() {
        this.intersections.forEach(intersection => {
            this.optimizeIntersectionTiming(intersection);
        });
        
        // Coordinate between intersections for green waves
        this.coordinateIntersections();
    }
    
    // Optimize timing for a single intersection using RL
    optimizeIntersectionTiming(intersection) {
        const state = this.createIntersectionState(intersection);
        const availableActions = this.getTimingActions();
        
        // Simple Q-learning for timing optimization
        const action = this.selectOptimalAction(intersection, state, availableActions);
        const reward = this.calculateTimingReward(intersection);
        
        // Update Q-table
        if (intersection.lastState && intersection.lastAction) {
            this.updateTimingQValue(intersection, intersection.lastState, intersection.lastAction, reward, state);
        }
        
        intersection.lastState = state;
        intersection.lastAction = action;
        intersection.lastReward = reward;
        
        // Apply the action
        this.applyTimingAction(intersection, action);
    }
    
    // Create state representation for intersection
    createIntersectionState(intersection) {
        const state = {
            totalVehicles: Array.from(intersection.detectedVehicles).length,
            maxQueueLength: Math.max(...Object.values(intersection.vehicleQueues).map(q => q.length)),
            averageWaitTime: intersection.metrics.averageWaitTime,
            currentPhase: intersection.currentPhase,
            timeOfDay: this.getTimeOfDay(),
            congestionLevel: this.globalTrafficState.congestionLevel
        };
        
        return JSON.stringify(state);
    }
    
    // Get available timing actions
    getTimingActions() {
        return [
            'extend_green_short',
            'extend_green_long',
            'reduce_green_short',
            'reduce_green_long',
            'maintain_timing',
            'skip_phase',
            'priority_phase'
        ];
    }
    
    // Select optimal action using epsilon-greedy
    selectOptimalAction(intersection, state, actions) {
        const epsilon = 0.1; // 10% exploration
        
        if (Math.random() < epsilon) {
            return actions[Math.floor(Math.random() * actions.length)];
        }
        
        let bestAction = actions[0];
        let bestValue = this.getTimingQValue(intersection, state, bestAction);
        
        for (let i = 1; i < actions.length; i++) {
            const value = this.getTimingQValue(intersection, state, actions[i]);
            if (value > bestValue) {
                bestValue = value;
                bestAction = actions[i];
            }
        }
        
        return bestAction;
    }
    
    // Get Q-value for timing optimization
    getTimingQValue(intersection, state, action) {
        const key = `${state}|${action}`;
        return intersection.qTable.get(key) || 0;
    }
    
    // Update Q-value for timing optimization
    updateTimingQValue(intersection, state, action, reward, nextState) {
        const key = `${state}|${action}`;
        const currentQ = this.getTimingQValue(intersection, state, action);
        
        const nextActions = this.getTimingActions();
        const maxNextQ = Math.max(...nextActions.map(a => this.getTimingQValue(intersection, nextState, a)));
        
        const newQ = currentQ + this.learningRate * (reward + 0.9 * maxNextQ - currentQ);
        intersection.qTable.set(key, newQ);
    }
    
    // Calculate reward for timing optimization
    calculateTimingReward(intersection) {
        let reward = 0;
        
        // Reward based on efficiency
        reward += intersection.metrics.efficiency * 10;
        
        // Penalty for long wait times
        reward -= intersection.metrics.averageWaitTime * 0.01;
        
        // Reward for throughput
        reward += intersection.metrics.vehiclesPassed * 0.1;
        
        // Penalty for congestion
        const totalQueueLength = Object.values(intersection.vehicleQueues)
                                      .reduce((sum, queue) => sum + queue.length, 0);
        reward -= totalQueueLength * 0.5;
        
        return reward;
    }
    
    // Apply timing action to intersection
    applyTimingAction(intersection, action) {
        const currentTiming = intersection.timing;
        
        switch (action) {
            case 'extend_green_short':
                currentTiming.greenTime = Math.min(currentTiming.greenTime + 5000, 45000);
                break;
            case 'extend_green_long':
                currentTiming.greenTime = Math.min(currentTiming.greenTime + 10000, 60000);
                break;
            case 'reduce_green_short':
                currentTiming.greenTime = Math.max(currentTiming.greenTime - 5000, 15000);
                break;
            case 'reduce_green_long':
                currentTiming.greenTime = Math.max(currentTiming.greenTime - 10000, 10000);
                break;
            case 'skip_phase':
                // Skip to next phase immediately if current queue is empty
                const currentQueue = intersection.vehicleQueues[intersection.directions[intersection.currentPhase]];
                if (currentQueue.length === 0) {
                    const nextPhase = (intersection.currentPhase + 1) % intersection.directions.length;
                    this.setIntersectionPhase(intersection, nextPhase);
                }
                break;
            case 'priority_phase':
                // Find direction with longest queue and prioritize it
                let maxQueueDir = intersection.directions[0];
                let maxQueueLength = 0;
                
                intersection.directions.forEach(direction => {
                    const queueLength = intersection.vehicleQueues[direction]?.length || 0;
                    if (queueLength > maxQueueLength) {
                        maxQueueLength = queueLength;
                        maxQueueDir = direction;
                    }
                });
                
                const priorityPhase = intersection.directions.indexOf(maxQueueDir);
                if (priorityPhase !== -1 && priorityPhase !== intersection.currentPhase) {
                    this.setIntersectionPhase(intersection, priorityPhase);
                }
                break;
        }
        
        // Recalculate cycle time
        currentTiming.cycleTime = 
            currentTiming.greenTime * intersection.directions.length + 
            currentTiming.yellowTime * intersection.directions.length + 
            currentTiming.redTime;
    }
    
    // Coordinate intersections for green waves
    coordinateIntersections() {
        const intersectionArray = Array.from(this.intersections.values());
        
        // Simple green wave coordination for main roads
        intersectionArray.forEach((intersection, index) => {
            if (index > 0) {
                const prevIntersection = intersectionArray[index - 1];
                const distance = this.calculateDistance(intersection.position, prevIntersection.position);
                const travelTime = distance / 15; // Assuming 15 m/s average speed
                
                // Adjust timing to create green wave
                const phaseOffset = (travelTime * 1000) % intersection.timing.cycleTime;
                intersection.coordinated = true;
                intersection.phaseOffset = phaseOffset;
            }
        });
    }
    
    // Setup intersection coordination
    setupIntersectionCoordination() {
        // Create coordination groups based on proximity
        const coordinationGroups = [];
        const processedIntersections = new Set();
        
        this.intersections.forEach(intersection => {
            if (!processedIntersections.has(intersection.id)) {
                const group = this.findNearbyIntersections(intersection, 200); // 200m radius
                coordinationGroups.push(group);
                group.forEach(groupIntersection => {
                    processedIntersections.add(groupIntersection.id);
                });
            }
        });
        
        console.log(`🚦 Created ${coordinationGroups.length} coordination groups`);
    }
    
    // Find nearby intersections for coordination
    findNearbyIntersections(centerIntersection, radius) {
        const group = [centerIntersection];
        
        this.intersections.forEach(intersection => {
            if (intersection.id !== centerIntersection.id) {
                const distance = this.calculateDistance(centerIntersection.position, intersection.position);
                if (distance <= radius) {
                    group.push(intersection);
                }
            }
        });
        
        return group;
    }
    
    // Update global traffic state
    updateGlobalTrafficState(vehicles) {
        this.globalTrafficState.totalVehicles = vehicles.length;
        
        if (vehicles.length > 0) {
            const totalSpeed = vehicles.reduce((sum, vehicle) => sum + (vehicle.speed || 0), 0);
            this.globalTrafficState.averageSpeed = totalSpeed / vehicles.length;
            
            // Calculate congestion level based on average speed and density
            const speedRatio = this.globalTrafficState.averageSpeed / 20; // Assuming 20 m/s is free flow
            const densityFactor = Math.min(vehicles.length / 50, 1); // Normalize to 50 vehicles
            this.globalTrafficState.congestionLevel = Math.max(0, 1 - speedRatio) * densityFactor;
        }
    }
    
    // Update performance metrics
    updatePerformanceMetrics() {
        let totalWaitTime = 0;
        let totalVehicles = 0;
        let totalThroughput = 0;
        
        this.intersections.forEach(intersection => {
            totalWaitTime += intersection.metrics.totalWaitTime;
            totalThroughput += intersection.metrics.vehiclesPassed;
            
            Object.values(intersection.vehicleQueues).forEach(queue => {
                totalVehicles += queue.length;
            });
        });
        
        this.performanceMetrics.totalWaitTime = totalWaitTime;
        this.performanceMetrics.averageWaitTime = totalVehicles > 0 ? totalWaitTime / totalVehicles : 0;
        this.performanceMetrics.throughput = totalThroughput;
        
        // Estimate fuel consumption and emissions based on wait times
        this.performanceMetrics.fuelConsumption = totalWaitTime * 0.001; // Simplified calculation
        this.performanceMetrics.emissions = this.performanceMetrics.fuelConsumption * 2.3; // CO2 factor
    }
    
    // Get time of day category
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 9) return 'morning_rush';
        if (hour >= 9 && hour < 16) return 'midday';
        if (hour >= 16 && hour < 19) return 'evening_rush';
        if (hour >= 19 && hour < 22) return 'evening';
        return 'night';
    }
    
    // Get traffic light state for visualization
    getTrafficLightStates() {
        const states = {};
        
        this.intersections.forEach(intersection => {
            states[intersection.id] = {
                position: intersection.position,
                lights: intersection.lights,
                currentPhase: intersection.currentPhase,
                phaseStartTime: intersection.phaseStartTime,
                timing: intersection.timing,
                vehicleQueues: intersection.vehicleQueues,
                metrics: intersection.metrics,
                emergencyOverride: intersection.emergencyOverride
            };
        });
        
        return states;
    }
    
    // Get performance statistics
    getPerformanceStats() {
        const intersectionStats = {};
        
        this.intersections.forEach(intersection => {
            intersectionStats[intersection.id] = {
                ...intersection.metrics,
                qTableSize: intersection.qTable.size,
                detectedVehicles: intersection.detectedVehicles.size,
                totalQueueLength: Object.values(intersection.vehicleQueues)
                                       .reduce((sum, queue) => sum + queue.length, 0)
            };
        });
        
        return {
            global: this.performanceMetrics,
            globalTrafficState: this.globalTrafficState,
            intersections: intersectionStats,
            totalIntersections: this.intersections.size,
            emergencyMode: this.emergencyOverride
        };
    }
    
    // Manual control methods for testing
    setIntersectionLight(intersectionId, direction, state) {
        const intersection = this.intersections.get(intersectionId);
        if (intersection && intersection.lights[direction]) {
            this.setLightState(intersection, direction, state);
            console.log(`🚦 Manual control: Intersection ${intersectionId} ${direction} set to ${state}`);
        }
    }
    
    // Emergency override for entire system
    activateGlobalEmergencyMode() {
        this.emergencyOverride = true;
        this.intersections.forEach(intersection => {
            // Set all lights to red for safety
            Object.keys(intersection.lights).forEach(direction => {
                intersection.lights[direction].state = 'red';
            });
        });
        console.log('🚨 Global emergency mode activated - All lights RED');
    }
    
    deactivateGlobalEmergencyMode() {
        this.emergencyOverride = false;
        this.intersections.forEach(intersection => {
            intersection.emergencyOverride = false;
            this.setIntersectionPhase(intersection, 0);
        });
        console.log('🚦 Global emergency mode deactivated - Normal operation resumed');
    }
    
    // Reset all intersections
    reset() {
        this.intersections.forEach(intersection => {
            intersection.metrics = {
                vehiclesPassed: 0,
                totalWaitTime: 0,
                averageWaitTime: 0,
                cycleCount: 0,
                efficiency: 1.0
            };
            
            intersection.qTable.clear();
            intersection.lastState = null;
            intersection.lastAction = null;
            intersection.lastReward = 0;
            
            this.setIntersectionPhase(intersection, 0);
        });
        
        this.performanceMetrics = {
            totalWaitTime: 0,
            averageWaitTime: 0,
            throughput: 0,
            fuelConsumption: 0,
            emissions: 0
        };
        
        console.log('🔄 Traffic Light Controller reset');
    }
} 