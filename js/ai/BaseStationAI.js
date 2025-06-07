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
        
        this.lastNetworkType = null;
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
            if (distance <= range) {
                availableNetworks.push(networkType);
            }
        }
        
        return availableNetworks;
    }

    selectBestNetwork(vehicle) {
        const availableNetworks = this.getAvailableNetworks(vehicle);
        if (availableNetworks.length === 0) return null;

        // Epsilon-greedy policy
        if (Math.random() < this.epsilon) {
            // Exploration: choose random available network
            return availableNetworks[Math.floor(Math.random() * availableNetworks.length)];
        } else {
            // Exploitation: choose best known action
            let bestNetwork = null;
            let bestScore = -Infinity;

            for (const networkType of availableNetworks) {
                const config = CONFIG.NETWORK.TYPES[networkType];
                const score = this.calculateNetworkScore(networkType, config, vehicle);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestNetwork = networkType;
                }
            }

            return bestNetwork;
        }
    }

    calculateNetworkScore(networkType, config, vehicle) {
        const position = vehicle.position;
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const baseStationOffset = roadWidth / 2 + CONFIG.BASE_STATION.POSITION_X_OFFSET;
        const baseStationPosition = new THREE.Vector3(baseStationOffset, 0, 0);
        
        const distance = position.distanceTo(baseStationPosition);
        const distanceRatio = distance / config.range;
        
        // Base score from network characteristics
        let score = -config.latencyMs - (config.packetLossRate * 1000);
        
        // Penalize based on distance
        score -= distanceRatio * 100;
        
        // Bonus for staying on the same network
        if (networkType === this.lastNetworkType) {
            score += 50;
        }
        
        return score;
    }

    update(vehicle) {
        const selectedNetwork = this.selectBestNetwork(vehicle);
        if (selectedNetwork) {
            // Decay exploration rate
            this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
            this.lastNetworkType = selectedNetwork;
        }
        return selectedNetwork;
    }

    getEpsilon() {
        return this.epsilon;
    }
} 