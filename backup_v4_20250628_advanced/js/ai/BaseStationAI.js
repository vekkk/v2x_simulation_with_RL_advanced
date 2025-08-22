import { CONFIG } from '../config/config.js';
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export class BaseStationAI {
    constructor() {
        // Q-Learning parameters
        this.qTable = new Map(); // State-action Q-values
        this.epsilon = CONFIG.RL_REWARDS.EPSILON_START; // Exploration rate
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
        
        // Message type tracking
        this.messageTypeStats = {};
        Object.keys(CONFIG.MESSAGE_TYPES).forEach(type => {
            this.messageTypeStats[type] = {
                sent: 0,
                successful: 0,
                failed: 0,
                totalReward: 0
            };
        });
        
        console.log('RL-based BaseStationAI initialized with Q-Learning');
    }

    // Create state representation from vehicle and environment
    createState(vehicle, messageType) {
        const position = vehicle.position;
        const baseStationPosition = this.getBaseStationPosition();
        const distance = position.distanceTo(baseStationPosition);
        
        // Discretize continuous values for state representation
        const distanceCategory = this.discretizeDistance(distance);
        const speedCategory = this.discretizeSpeed(vehicle.userData.speed);
        const laneCategory = vehicle.userData.lane;
        
        // Include message type in state
        const state = `${distanceCategory}_${speedCategory}_${laneCategory}_${messageType}`;
        return state;
    }

    discretizeDistance(distance) {
        if (distance <= 30) return 'CLOSE';
        if (distance <= 60) return 'MEDIUM';
        if (distance <= 100) return 'FAR';
        return 'VERY_FAR';
    }

    discretizeSpeed(speed) {
        if (speed <= 15) return 'SLOW';
        if (speed <= 30) return 'MEDIUM';
        return 'FAST';
    }

    getBaseStationPosition() {
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const baseStationOffset = roadWidth / 2 + CONFIG.BASE_STATION.POSITION_X_OFFSET;
        return new THREE.Vector3(-baseStationOffset, 0, 0);
    }

    // Get available actions (networks) for current state
    getAvailableActions(vehicle) {
        const availableNetworks = [];
        const position = vehicle.position;
        const baseStationPosition = this.getBaseStationPosition();
        
        // Check each network type's availability
        for (const [networkType, config] of Object.entries(CONFIG.NETWORK.TYPES)) {
            const distance = position.distanceTo(baseStationPosition);
            if (distance <= config.range) {
                availableNetworks.push(networkType);
            }
        }
        
        return availableNetworks.length > 0 ? availableNetworks : ['NONE'];
    }

    // Get Q-value for state-action pair
    getQValue(state, action) {
        const key = `${state}_${action}`;
        return this.qTable.get(key) || 0;
    }

    // Set Q-value for state-action pair
    setQValue(state, action, value) {
        const key = `${state}_${action}`;
        this.qTable.set(key, value);
    }

    // Select action using epsilon-greedy policy
    selectAction(state, availableActions) {
        // Exploration vs Exploitation
        if (Math.random() < this.epsilon) {
            // Explore: random action
            const randomIndex = Math.floor(Math.random() * availableActions.length);
            return availableActions[randomIndex];
        } else {
            // Exploit: best known action
            let bestAction = availableActions[0];
            let bestQValue = this.getQValue(state, bestAction);
            
            for (const action of availableActions) {
                const qValue = this.getQValue(state, action);
                if (qValue > bestQValue) {
                    bestQValue = qValue;
                    bestAction = action;
                }
            }
            return bestAction;
        }
    }

    // Calculate reward based on transmission outcome and message type
    calculateReward(vehicle, messageType, networkType, transmissionSuccess, latency, distance) {
        let reward = 0;
        const messageConfig = CONFIG.MESSAGE_TYPES[messageType];
        const networkConfig = CONFIG.NETWORK.TYPES[networkType];
        
        // Base reward/penalty
        if (transmissionSuccess) {
            reward += CONFIG.RL_REWARDS.SUCCESSFUL_TRANSMISSION;
            
            // Reliability bonus if meeting requirements
            const reliabilityMet = true; // Simplified - in real implementation, track over time
            if (reliabilityMet) {
                reward += CONFIG.RL_REWARDS.RELIABILITY_BONUS;
            }
        } else {
            reward += CONFIG.RL_REWARDS.FAILED_TRANSMISSION;
        }
        
        // Apply message type multiplier
        const multiplier = CONFIG.RL_REWARDS.MESSAGE_TYPE_MULTIPLIERS[messageType] || 1.0;
        reward *= multiplier;
        
        // Latency penalty
        if (latency > messageConfig.latencyRequirement) {
            const excessLatency = latency - messageConfig.latencyRequirement;
            reward -= excessLatency * CONFIG.RL_REWARDS.LATENCY_PENALTY_PER_MS;
        }
        
        // Distance penalty
        reward -= distance * CONFIG.RL_REWARDS.DISTANCE_PENALTY_PER_METER;
        
        // Network match bonus
        if (networkConfig.preferredMessages && networkConfig.preferredMessages.includes(messageType)) {
            reward += CONFIG.RL_REWARDS.NETWORK_MATCH_BONUS;
        }
        
        // Bandwidth efficiency bonus
        const bandwidthUsage = messageConfig.size / (networkConfig.bandwidth * 1000); // Simplified calculation
        if (bandwidthUsage < 0.1) { // Less than 10% bandwidth usage
            reward += CONFIG.RL_REWARDS.BANDWIDTH_EFFICIENCY_BONUS;
        }
        
        return reward;
    }

    // Update Q-value using Q-learning update rule
    updateQValue(state, action, reward, nextState, nextAvailableActions) {
        const currentQ = this.getQValue(state, action);
        
        // Find max Q-value for next state
        let maxNextQ = 0;
        if (nextAvailableActions.length > 0) {
            maxNextQ = Math.max(...nextAvailableActions.map(a => this.getQValue(nextState, a)));
        }
        
        // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
        const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
        this.setQValue(state, action, newQ);
        
        // Track performance
        this.totalReward += reward;
        this.actionHistory.push({
            state,
            action,
            reward,
            qValue: newQ,
            timestamp: Date.now()
        });
    }

    // Generate random message type based on realistic probabilities
    generateMessageType(vehicle) {
        const random = Math.random();
        
        // Realistic message distribution
        if (random < 0.05) return 'SAFETY_MESSAGE';      // 5% - rare but critical
        if (random < 0.50) return 'BASIC_CAM_MESSAGE';   // 45% - most common
        if (random < 0.80) return 'TRAFFIC_MESSAGE';     // 30% - frequent
        return 'INFOTAINMENT_MESSAGE';                   // 20% - background traffic
    }

    // Main update method called by NetworkManager
    update(vehicle) {
        // Generate message type for this transmission
        const messageType = this.generateMessageType(vehicle);
        
        // Create current state
        const currentState = this.createState(vehicle, messageType);
        const availableActions = this.getAvailableActions(vehicle);
        
        if (availableActions.length === 0 || availableActions[0] === 'NONE') {
            return null;
        }
        
        // Select action (network)
        const selectedNetwork = this.selectAction(currentState, availableActions);
        
        // If we have previous experience, update Q-value
        if (this.lastState && this.lastAction) {
            this.updateQValue(
                this.lastState,
                this.lastAction,
                this.lastReward,
                currentState,
                availableActions
            );
        }
        
        // Store current state and action for next update
        this.lastState = currentState;
        this.lastAction = selectedNetwork;
        
        // Store message type in vehicle for NetworkManager to use
        vehicle.userData.currentMessageType = messageType;
        vehicle.userData.messageConfig = CONFIG.MESSAGE_TYPES[messageType];
        
        // Decay epsilon (reduce exploration over time)
        this.epsilon = Math.max(
            CONFIG.RL_REWARDS.EPSILON_END,
            this.epsilon * CONFIG.RL_REWARDS.EPSILON_DECAY
        );
        
        console.log(`Vehicle ${vehicle.userData.id}: Message=${messageType}, Network=${selectedNetwork}, State=${currentState}, ε=${this.epsilon.toFixed(3)}`);
        
        return selectedNetwork;
    }

    // Called by NetworkManager after transmission attempt
    updateReward(vehicle, networkType, transmissionSuccess, latency, distance) {
        const messageType = vehicle.userData.currentMessageType || 'BASIC_CAM_MESSAGE';
        
        // Calculate reward
        const reward = this.calculateReward(
            vehicle,
            messageType,
            networkType,
            transmissionSuccess,
            latency,
            distance
        );
        
        this.lastReward = reward;
        
        // Update message type statistics
        if (this.messageTypeStats[messageType]) {
            this.messageTypeStats[messageType].sent++;
            this.messageTypeStats[messageType].totalReward += reward;
            
            if (transmissionSuccess) {
                this.messageTypeStats[messageType].successful++;
            } else {
                this.messageTypeStats[messageType].failed++;
            }
        }
        
        console.log(`Reward: ${reward.toFixed(2)} for ${messageType} via ${networkType} (Success: ${transmissionSuccess})`);
    }

    // Get AI performance statistics
    getStats() {
        return {
            totalReward: this.totalReward,
            episodeCount: this.episodeCount,
            epsilon: this.epsilon,
            qTableSize: this.qTable.size,
            messageTypeStats: this.messageTypeStats,
            averageReward: this.actionHistory.length > 0 ? 
                this.totalReward / this.actionHistory.length : 0
        };
    }

    // Reset learning (for testing different strategies)
    reset() {
        this.qTable.clear();
        this.epsilon = CONFIG.RL_REWARDS.EPSILON_START;
        this.totalReward = 0;
        this.episodeCount = 0;
        this.actionHistory = [];
        this.lastState = null;
        this.lastAction = null;
        this.lastReward = 0;
        
        // Reset message type stats
        Object.keys(this.messageTypeStats).forEach(type => {
            this.messageTypeStats[type] = {
                sent: 0,
                successful: 0,
                failed: 0,
                totalReward: 0
            };
        });
        
        console.log('BaseStationAI reset');
    }

    // Interactive control methods
    setLearningRate(rate) {
        this.learningRate = Math.max(0.001, Math.min(1.0, rate));
        console.log(`AI learning rate set to ${this.learningRate}`);
    }

    getLearningRate() {
        return this.learningRate;
    }

    getExplorationRate() {
        return this.epsilon;
    }

    setExplorationRate(rate) {
        this.epsilon = Math.max(0.0, Math.min(1.0, rate));
        console.log(`AI exploration rate set to ${this.epsilon}`);
    }

    getConfidence() {
        // Confidence based on exploration rate (inverse relationship)
        return Math.max(0, 100 - (this.epsilon * 100));
    }

    // Update processing reward for AI learning feedback
    updateProcessingReward(vehicleId, reward) {
        this.totalReward += reward;
        console.log(`Processing reward for vehicle ${vehicleId}: ${reward.toFixed(3)}`);
        
        // Track processing rewards separately
        if (!this.processingRewards) {
            this.processingRewards = {};
        }
        
        if (!this.processingRewards[vehicleId]) {
            this.processingRewards[vehicleId] = {
                totalReward: 0,
                count: 0,
                averageReward: 0
            };
        }
        
        this.processingRewards[vehicleId].totalReward += reward;
        this.processingRewards[vehicleId].count++;
        this.processingRewards[vehicleId].averageReward = 
            this.processingRewards[vehicleId].totalReward / this.processingRewards[vehicleId].count;
    }
    
    // Get processing statistics
    getProcessingStats() {
        if (!this.processingRewards) {
            return {
                totalVehicles: 0,
                totalProcessingReward: 0,
                averageProcessingReward: 0
            };
        }
        
        const totalVehicles = Object.keys(this.processingRewards).length;
        const totalProcessingReward = Object.values(this.processingRewards)
            .reduce((sum, stats) => sum + stats.totalReward, 0);
        const averageProcessingReward = totalVehicles > 0 ? totalProcessingReward / totalVehicles : 0;
        
        return {
            totalVehicles,
            totalProcessingReward,
            averageProcessingReward,
            vehicleStats: this.processingRewards
        };
    }
} 