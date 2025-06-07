import { CONFIG } from '../config/config.js';
import * as THREE from 'three';

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
        
        // Get tower positions from CONFIG
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const towerOffset = roadWidth / 2 + 10;
        
        // Define tower positions
        const towerPositions = {
            DSRC: new THREE.Vector3(-towerOffset, 7.5, 0),
            WIFI: new THREE.Vector3(towerOffset, 10, 0),
            LTE: new THREE.Vector3(0, 12.5, -towerOffset)
        };
        
        // Check each network type's availability
        for (const [networkType, config] of Object.entries(CONFIG.NETWORK.TYPES)) {
            const towerPos = towerPositions[networkType];
            const distance = position.distanceTo(towerPos);
            const range = config.range;
            console.log(`Vehicle ${vehicle.id}: Distance to ${networkType} tower: ${distance.toFixed(2)} units (range: ${range})`);
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
        const stateKey = JSON.stringify(state);
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, new Map());
        }
        
        const stateActions = this.qTable.get(stateKey);
        const oldValue = stateActions.get(action) || 0;
        const newValue = oldValue + this.alpha * (reward - oldValue);
        stateActions.set(action, newValue);
        
        // Decay exploration rate
        this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
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

    getEpsilon() {
        return this.epsilon;
    }
} 