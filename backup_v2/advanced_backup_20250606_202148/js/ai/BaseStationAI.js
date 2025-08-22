import { CONFIG } from '../config/config.js';
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export class BaseStationAI {
    constructor() {
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
            console.log(`Vehicle ${vehicle.id}: Distance to base station: ${distance.toFixed(2)} units (${networkType} range: ${range})`);
            if (distance <= range) {
                availableNetworks.push(networkType);
            }
        }
        
        console.log(`Vehicle ${vehicle.id}: Available networks: ${availableNetworks.join(', ') || 'None'}`);
        return availableNetworks;
    }

    selectBestNetwork(vehicle) {
        const availableNetworks = this.getAvailableNetworks(vehicle);
        if (availableNetworks.length === 0) return null;

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
            this.lastNetworkType = selectedNetwork;
        }
        return selectedNetwork;
    }
} 