import { CONFIG } from '../config/config.js';

export class RSUAgent {
    constructor(rsuId, position) {
        this.rsuId = rsuId;
        this.position = position;
        
        // Q-learning parameters
        this.qTable = new Map();
        this.epsilon = CONFIG.RL_REWARDS.EPSILON_START;
        this.learningRate = CONFIG.RL_REWARDS.LEARNING_RATE;
        this.discountFactor = CONFIG.RL_REWARDS.DISCOUNT_FACTOR;
        
        // State tracking
        this.lastState = null;
        this.lastAction = null;
        this.lastReward = 0;
        
        // Performance tracking
        this.totalReward = 0;
        this.episodeCount = 0;
        this.actionHistory = [];
        
        // RSU-specific capabilities
        this.processingCapacity = 100; // Tasks per second
        this.currentLoad = 0;
        this.networkInterfaces = ['DSRC', 'WIFI', 'LTE'];
        this.coverage = {
            DSRC: CONFIG.NETWORK.TYPES.DSRC.range,
            WIFI: CONFIG.NETWORK.TYPES.WIFI.range,
            LTE: CONFIG.NETWORK.TYPES.LTE.range
        };
        
        // Local message statistics
        this.messageStats = {};
        Object.keys(CONFIG.MESSAGE_TYPES).forEach(type => {
            this.messageStats[type] = {
                sent: 0,
                received: 0,
                failed: 0,
                avgLatency: 0,
                successRate: 0
            };
        });
        
        // Cooperation with other RSUs
        this.neighborRSUs = [];
        this.cooperationHistory = new Map();
        
        console.log(`🤖 RSU Agent ${this.rsuId} initialized at position:`, this.position);
    }
    
    // Create state representation for Q-learning
    createState(vehicleInfo, messageType, networkConditions) {
        const state = {
            vehicleDistance: this.calculateDistance(vehicleInfo.position),
            messageType: messageType,
            networkLoad: this.getCurrentNetworkLoad(),
            processingLoad: this.currentLoad / this.processingCapacity,
            neighborLoad: this.getNeighborAverageLoad(),
            timeOfDay: this.getTimeCategory(),
            messageQueue: this.getMessageQueueSize()
        };
        
        return JSON.stringify(state);
    }
    
    // Get available actions for the RSU
    getAvailableActions(messageType) {
        const actions = [];
        
        // Network selection actions
        this.networkInterfaces.forEach(network => {
            if (this.isNetworkAvailable(network, messageType)) {
                actions.push(`use_${network.toLowerCase()}`);
            }
        });
        
        // Processing actions
        actions.push('process_locally');
        actions.push('forward_to_base');
        
        // Cooperation actions
        if (this.neighborRSUs.length > 0) {
            actions.push('forward_to_neighbor');
            actions.push('request_cooperation');
        }
        
        // Priority handling actions
        actions.push('prioritize_message');
        actions.push('queue_message');
        
        return actions;
    }
    
    // Select action using epsilon-greedy policy
    selectAction(state, availableActions) {
        if (Math.random() < this.epsilon) {
            // Exploration: random action
            const randomIndex = Math.floor(Math.random() * availableActions.length);
            return availableActions[randomIndex];
        } else {
            // Exploitation: best known action
            let bestAction = availableActions[0];
            let bestValue = this.getQValue(state, bestAction);
            
            for (let i = 1; i < availableActions.length; i++) {
                const action = availableActions[i];
                const qValue = this.getQValue(state, action);
                if (qValue > bestValue) {
                    bestValue = qValue;
                    bestAction = action;
                }
            }
            
            return bestAction;
        }
    }
    
    // Get Q-value for state-action pair
    getQValue(state, action) {
        const key = `${state}|${action}`;
        return this.qTable.get(key) || 0;
    }
    
    // Update Q-value using Q-learning update rule
    updateQValue(state, action, reward, nextState, nextActions) {
        const key = `${state}|${action}`;
        const currentQ = this.getQValue(state, action);
        
        let maxNextQ = 0;
        if (nextActions && nextActions.length > 0) {
            maxNextQ = Math.max(...nextActions.map(a => this.getQValue(nextState, a)));
        }
        
        const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
        this.qTable.set(key, newQ);
    }
    
    // Calculate reward based on action outcome
    calculateReward(action, outcome) {
        let reward = 0;
        
        // Base reward based on transmission success
        if (outcome.success) {
            reward += CONFIG.RL_REWARDS.SUCCESSFUL_TRANSMISSION;
        } else {
            reward += CONFIG.RL_REWARDS.FAILED_TRANSMISSION;
        }
        
        // Message type multiplier
        const messageType = outcome.messageType;
        if (CONFIG.RL_REWARDS.MESSAGE_TYPE_MULTIPLIERS[messageType]) {
            reward *= CONFIG.RL_REWARDS.MESSAGE_TYPE_MULTIPLIERS[messageType];
        }
        
        // Latency penalty
        if (outcome.latency > CONFIG.MESSAGE_TYPES[messageType]?.latencyRequirement) {
            const excessLatency = outcome.latency - CONFIG.MESSAGE_TYPES[messageType].latencyRequirement;
            reward -= excessLatency * CONFIG.RL_REWARDS.LATENCY_PENALTY_PER_MS;
        }
        
        // Distance penalty
        reward -= outcome.distance * CONFIG.RL_REWARDS.DISTANCE_PENALTY_PER_METER;
        
        // Network efficiency bonus
        if (this.isOptimalNetworkChoice(action, messageType)) {
            reward += CONFIG.RL_REWARDS.NETWORK_MATCH_BONUS;
        }
        
        // Processing efficiency bonus
        if (action === 'process_locally' && this.currentLoad < 0.8) {
            reward += 5; // Bonus for local processing when capacity available
        }
        
        // Cooperation bonus
        if (action.includes('cooperation') && outcome.cooperationSuccess) {
            reward += 8; // Bonus for successful cooperation
        }
        
        return reward;
    }
    
    // Main update method called after each action
    update(vehicleInfo, messageType, action, outcome) {
        const state = this.createState(vehicleInfo, messageType, outcome.networkConditions);
        const reward = this.calculateReward(action, outcome);
        
        // Update Q-values if we have previous state-action pair
        if (this.lastState && this.lastAction) {
            const nextActions = this.getAvailableActions(messageType);
            this.updateQValue(this.lastState, this.lastAction, this.lastReward, state, nextActions);
        }
        
        // Store current state and action for next update
        this.lastState = state;
        this.lastAction = action;
        this.lastReward = reward;
        
        // Update performance tracking
        this.totalReward += reward;
        this.actionHistory.push({
            timestamp: Date.now(),
            state: state,
            action: action,
            reward: reward,
            outcome: outcome
        });
        
        // Update message statistics
        this.updateMessageStats(messageType, outcome);
        
        // Decay epsilon for less exploration over time
        this.epsilon = Math.max(CONFIG.RL_REWARDS.EPSILON_END, 
                               this.epsilon * CONFIG.RL_REWARDS.EPSILON_DECAY);
    }
    
    // Process message with RL decision making
    processMessage(vehicleInfo, messageType, messageData) {
        const networkConditions = this.assessNetworkConditions();
        const state = this.createState(vehicleInfo, messageType, networkConditions);
        const availableActions = this.getAvailableActions(messageType);
        const selectedAction = this.selectAction(state, availableActions);
        
        // Execute the selected action
        const outcome = this.executeAction(selectedAction, vehicleInfo, messageType, messageData);
        
        // Update Q-learning based on outcome
        this.update(vehicleInfo, messageType, selectedAction, outcome);
        
        return {
            action: selectedAction,
            outcome: outcome,
            rsuId: this.rsuId
        };
    }
    
    // Execute the selected action
    executeAction(action, vehicleInfo, messageType, messageData) {
        const startTime = performance.now();
        let outcome = {
            success: false,
            latency: 0,
            distance: this.calculateDistance(vehicleInfo.position),
            messageType: messageType,
            networkConditions: this.assessNetworkConditions(),
            cooperationSuccess: false
        };
        
        try {
            switch (action) {
                case 'use_dsrc':
                case 'use_wifi':
                case 'use_lte':
                    outcome = this.transmitViaNetwork(action, vehicleInfo, messageType, messageData);
                    break;
                    
                case 'process_locally':
                    outcome = this.processLocally(vehicleInfo, messageType, messageData);
                    break;
                    
                case 'forward_to_base':
                    outcome = this.forwardToBaseStation(vehicleInfo, messageType, messageData);
                    break;
                    
                case 'forward_to_neighbor':
                    outcome = this.forwardToNeighbor(vehicleInfo, messageType, messageData);
                    break;
                    
                case 'request_cooperation':
                    outcome = this.requestCooperation(vehicleInfo, messageType, messageData);
                    break;
                    
                case 'prioritize_message':
                    outcome = this.prioritizeMessage(vehicleInfo, messageType, messageData);
                    break;
                    
                case 'queue_message':
                    outcome = this.queueMessage(vehicleInfo, messageType, messageData);
                    break;
                    
                default:
                    console.warn(`Unknown action: ${action}`);
                    outcome.success = false;
            }
        } catch (error) {
            console.error(`Error executing action ${action}:`, error);
            outcome.success = false;
        }
        
        outcome.latency = performance.now() - startTime;
        return outcome;
    }
    
    // Network transmission methods
    transmitViaNetwork(networkAction, vehicleInfo, messageType, messageData) {
        const networkType = networkAction.replace('use_', '').toUpperCase();
        const networkConfig = CONFIG.NETWORK.TYPES[networkType];
        
        if (!networkConfig) {
            return { success: false, error: 'Invalid network type' };
        }
        
        const distance = this.calculateDistance(vehicleInfo.position);
        const inRange = distance <= networkConfig.range;
        const packetLoss = Math.random() < networkConfig.packetLossRate;
        
        return {
            success: inRange && !packetLoss,
            latency: networkConfig.latencyMs + (distance * 0.1),
            networkType: networkType,
            distance: distance,
            inRange: inRange,
            packetLoss: packetLoss
        };
    }
    
    // Local processing
    processLocally(vehicleInfo, messageType, messageData) {
        if (this.currentLoad >= this.processingCapacity) {
            return { success: false, error: 'Processing capacity exceeded' };
        }
        
        this.currentLoad += 1;
        
        // Simulate processing time based on message complexity
        const processingTime = CONFIG.MESSAGE_TYPES[messageType]?.size / 100 || 10;
        
        setTimeout(() => {
            this.currentLoad = Math.max(0, this.currentLoad - 1);
        }, processingTime);
        
        return {
            success: true,
            processingTime: processingTime,
            processedLocally: true
        };
    }
    
    // Forward to base station
    forwardToBaseStation(vehicleInfo, messageType, messageData) {
        // Simulate forwarding to base station
        const baseDistance = this.calculateDistance({ x: 0, y: 0, z: 0 }); // Assuming base at origin
        const forwardingLatency = baseDistance * 0.2; // Latency increases with distance
        
        return {
            success: true,
            forwardedToBase: true,
            forwardingLatency: forwardingLatency
        };
    }
    
    // Cooperation methods
    forwardToNeighbor(vehicleInfo, messageType, messageData) {
        if (this.neighborRSUs.length === 0) {
            return { success: false, error: 'No neighbor RSUs available' };
        }
        
        // Select best neighbor based on load and distance
        const bestNeighbor = this.selectBestNeighbor(vehicleInfo);
        
        return {
            success: true,
            forwardedToNeighbor: bestNeighbor.rsuId,
            cooperationSuccess: true
        };
    }
    
    requestCooperation(vehicleInfo, messageType, messageData) {
        // Implement cooperation request logic
        const cooperationRequests = this.neighborRSUs.map(neighbor => {
            return {
                neighborId: neighbor.rsuId,
                canCooperate: neighbor.currentLoad < neighbor.processingCapacity * 0.8
            };
        });
        
        const availableNeighbors = cooperationRequests.filter(req => req.canCooperate);
        
        return {
            success: availableNeighbors.length > 0,
            cooperationSuccess: availableNeighbors.length > 0,
            availableNeighbors: availableNeighbors.length
        };
    }
    
    // Helper methods
    calculateDistance(position) {
        const dx = this.position.x - position.x;
        const dy = this.position.y - position.y;
        const dz = this.position.z - position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    getCurrentNetworkLoad() {
        // Simulate network load based on current activity
        return Math.random() * 0.8; // 0-80% load
    }
    
    getNeighborAverageLoad() {
        if (this.neighborRSUs.length === 0) return 0;
        
        const totalLoad = this.neighborRSUs.reduce((sum, neighbor) => {
            return sum + (neighbor.currentLoad / neighbor.processingCapacity);
        }, 0);
        
        return totalLoad / this.neighborRSUs.length;
    }
    
    getTimeCategory() {
        const hour = new Date().getHours();
        if (hour >= 7 && hour <= 9) return 'morning_rush';
        if (hour >= 17 && hour <= 19) return 'evening_rush';
        if (hour >= 22 || hour <= 6) return 'night';
        return 'normal';
    }
    
    getMessageQueueSize() {
        // Simulate message queue size
        return Math.floor(Math.random() * 10);
    }
    
    isNetworkAvailable(network, messageType) {
        const networkConfig = CONFIG.NETWORK.TYPES[network];
        return networkConfig && networkConfig.preferredMessages.includes(messageType);
    }
    
    isOptimalNetworkChoice(action, messageType) {
        if (!action.startsWith('use_')) return false;
        
        const networkType = action.replace('use_', '').toUpperCase();
        const networkConfig = CONFIG.NETWORK.TYPES[networkType];
        
        return networkConfig && networkConfig.preferredMessages.includes(messageType);
    }
    
    selectBestNeighbor(vehicleInfo) {
        let bestNeighbor = this.neighborRSUs[0];
        let bestScore = -Infinity;
        
        this.neighborRSUs.forEach(neighbor => {
            const distance = this.calculateDistance(neighbor.position);
            const loadFactor = 1 - (neighbor.currentLoad / neighbor.processingCapacity);
            const score = loadFactor * 100 - distance * 0.1;
            
            if (score > bestScore) {
                bestScore = score;
                bestNeighbor = neighbor;
            }
        });
        
        return bestNeighbor;
    }
    
    assessNetworkConditions() {
        return {
            dsrcLoad: Math.random() * 0.6,
            wifiLoad: Math.random() * 0.7,
            lteLoad: Math.random() * 0.8,
            interference: Math.random() * 0.3
        };
    }
    
    updateMessageStats(messageType, outcome) {
        if (!this.messageStats[messageType]) return;
        
        const stats = this.messageStats[messageType];
        
        if (outcome.success) {
            stats.sent++;
            stats.avgLatency = (stats.avgLatency * (stats.sent - 1) + outcome.latency) / stats.sent;
        } else {
            stats.failed++;
        }
        
        stats.received++;
        stats.successRate = stats.sent / stats.received;
    }
    
    prioritizeMessage(vehicleInfo, messageType, messageData) {
        // Implement message prioritization logic
        const priority = CONFIG.MESSAGE_TYPES[messageType]?.priority || 4;
        
        return {
            success: true,
            prioritized: true,
            priority: priority
        };
    }
    
    queueMessage(vehicleInfo, messageType, messageData) {
        // Implement message queuing logic
        return {
            success: true,
            queued: true,
            queuePosition: this.getMessageQueueSize() + 1
        };
    }
    
    // Add neighbor RSU for cooperation
    addNeighbor(neighborRSU) {
        if (!this.neighborRSUs.find(n => n.rsuId === neighborRSU.rsuId)) {
            this.neighborRSUs.push(neighborRSU);
            console.log(`🤝 RSU ${this.rsuId} added neighbor RSU ${neighborRSU.rsuId}`);
        }
    }
    
    // Get performance statistics
    getStats() {
        return {
            rsuId: this.rsuId,
            position: this.position,
            totalReward: this.totalReward,
            episodeCount: this.episodeCount,
            epsilon: this.epsilon,
            currentLoad: this.currentLoad,
            processingCapacity: this.processingCapacity,
            loadPercentage: (this.currentLoad / this.processingCapacity) * 100,
            messageStats: this.messageStats,
            qTableSize: this.qTable.size,
            neighborCount: this.neighborRSUs.length,
            actionHistoryLength: this.actionHistory.length
        };
    }
    
    // Reset agent for new episode
    reset() {
        this.lastState = null;
        this.lastAction = null;
        this.lastReward = 0;
        this.currentLoad = 0;
        this.episodeCount++;
        
        // Reset message statistics
        Object.keys(this.messageStats).forEach(type => {
            this.messageStats[type] = {
                sent: 0,
                received: 0,
                failed: 0,
                avgLatency: 0,
                successRate: 0
            };
        });
        
        console.log(`🔄 RSU Agent ${this.rsuId} reset for episode ${this.episodeCount}`);
    }
} 