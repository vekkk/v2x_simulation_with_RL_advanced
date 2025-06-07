import { CONFIG } from '../config/config.js';
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export class BaseStationAI {
    constructor() {
        // Initialize Q-table as a Map for state-action pairs
        this.qTable = new Map();
        
        // Learning parameters
        this.alpha = 0.1;  // Learning rate
        this.epsilon = 1.0;  // Initial exploration rate
        this.epsilonDecay = 0.995;  // Decay rate for exploration
        this.minEpsilon = 0.01;  // Minimum exploration rate
        
        // Initialize state space
        this.initializeStateSpace();
        
        // Track last state and action for learning
        this.lastState = null;
        this.lastAction = null;
        
        // Track learning progress
        this.totalSteps = 0;
        this.successfulSteps = 0;
    }

    initializeStateSpace() {
        // Define possible states based on distance and network availability
        const distances = ['CLOSE', 'MEDIUM', 'FAR'];
        const networks = ['DSRC', 'WIFI', 'LTE'];
        
        // Create all possible combinations of network availability
        const networkCombinations = this.generateNetworkCombinations(networks);
        
        // Initialize Q-values for each state-action pair
        for (const distance of distances) {
            for (const networkCombo of networkCombinations) {
                const state = `${distance}_${networkCombo.join('_')}`;
                for (const network of networks) {
                    if (networkCombo.includes(network)) {
                        this.qTable.set(`${state}_${network}`, 0);
                    }
                }
            }
        }
    }

    generateNetworkCombinations(networks) {
        const combinations = [];
        const n = networks.length;
        
        // Generate all possible combinations of networks
        for (let i = 1; i <= n; i++) {
            const combo = networks.slice(0, i);
            combinations.push(combo);
        }
        
        return combinations;
    }

    getState(vehicle) {
        // Convert vehicle position to distance category
        const distance = this.getDistanceCategory(vehicle.position);
        
        // Get available networks based on signal strength
        const availableNetworks = this.getAvailableNetworks(vehicle);
        
        return `${distance}_${availableNetworks.join('_')}`;
    }

    getDistanceCategory(position) {
        const distance = Math.sqrt(position.x * position.x + position.z * position.z);
        
        if (distance <= CONFIG.NETWORK.TYPES.DSRC.RANGE) {
            return 'CLOSE';
        } else if (distance <= CONFIG.NETWORK.TYPES.WIFI.RANGE) {
            return 'MEDIUM';
        } else {
            return 'FAR';
        }
    }

    getAvailableNetworks(vehicle) {
        const availableNetworks = [];
        const position = vehicle.position;
        
        // Get base station position from CONFIG
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const baseStationOffset = roadWidth / 2 + CONFIG.BASE_STATION.POSITION_X_OFFSET;
        const baseStationPosition = new THREE.Vector3(baseStationOffset, 0, 0);
        
        // Check each network type's availability
        for (const [networkType, config] of Object.entries(CONFIG.NETWORK.TYPES)) {
            const distance = position.distanceTo(baseStationPosition);
            const range = config.range;
            console.log(`Vehicle ${vehicle.id}: Distance to base station: ${distance.toFixed(2)} units (${networkType} range: ${range})`);
            if (distance <= range) {
                availableNetworks.push(networkType);
            }
        }
        
        console.log(`Vehicle ${vehicle.id}: Available networks: ${availableNetworks.join(', ') || 'None'}`);
        return availableNetworks;
    }

    chooseAction(state) {
        // Epsilon-greedy policy
        if (Math.random() < this.epsilon) {
            // Exploration: choose random available network
            const availableNetworks = state.split('_').slice(1);
            return availableNetworks[Math.floor(Math.random() * availableNetworks.length)];
        } else {
            // Exploitation: choose best known action
            return this.getBestAction(state);
        }
    }

    getBestAction(state) {
        let bestAction = null;
        let bestValue = -Infinity;
        
        // Find the action with highest Q-value for current state
        const availableNetworks = state.split('_').slice(1);
        for (const network of availableNetworks) {
            const qValue = this.qTable.get(`${state}_${network}`) || 0;
            if (qValue > bestValue) {
                bestValue = qValue;
                bestAction = network;
            }
        }
        
        return bestAction;
    }

    learn(state, action, reward) {
        const stateKey = `${state}_${action}`;
        const oldValue = this.qTable.get(stateKey) || 0;
        const newValue = oldValue + this.alpha * (reward - oldValue);
        this.qTable.set(stateKey, newValue);
        
        // Decay exploration rate with safeguards
        this.epsilon = Math.max(this.minEpsilon, Math.min(1.0, this.epsilon * this.epsilonDecay));
        
        // Update learning progress
        this.totalSteps++;
        if (reward > 0) {
            this.successfulSteps++;
        }
    }

    calculateReward(packetSuccess, latency, distance) {
        let reward = 0;
        
        // Base reward for successful packet transfer
        if (packetSuccess) {
            reward += CONFIG.REWARDS.SUCCESS;
        } else {
            reward += CONFIG.REWARDS.FAILURE;
        }
        
        // Latency penalty
        reward -= latency * CONFIG.REWARDS.LATENCY_PENALTY;
        
        // Distance penalty
        reward -= distance * CONFIG.REWARDS.DISTANCE_PENALTY;
        
        return reward;
    }

    update(vehicle) {
        const currentState = this.getState(vehicle);
        const selectedNetwork = this.chooseAction(currentState);
        
        // If we have a previous state and action, learn from it
        if (this.lastState && this.lastAction) {
            const distance = vehicle.position.length();
            const latency = CONFIG.NETWORK.TYPES[this.lastAction].latencyMs;
            const packetSuccess = Math.random() > CONFIG.NETWORK.TYPES[this.lastAction].packetLossRate;
            
            const reward = this.calculateReward(packetSuccess, latency, distance);
            this.learn(this.lastState, this.lastAction, reward);
        }
        
        // Update last state and action
        this.lastState = currentState;
        this.lastAction = selectedNetwork;
        
        return selectedNetwork;
    }

    getEpsilon() {
        // Ensure epsilon is always a valid number between minEpsilon and 1.0
        return Math.max(this.minEpsilon, Math.min(1.0, this.epsilon));
    }

    getLearningProgress() {
        if (this.totalSteps === 0) return 0;
        return (this.successfulSteps / this.totalSteps) * 100;
    }
} 