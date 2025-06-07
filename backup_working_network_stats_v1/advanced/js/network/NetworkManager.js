import * as THREE from 'three';
import { CONFIG } from '../config/config.js';
import { BaseStationAI } from '../ai/BaseStationAI.js';

export class NetworkManager {
    constructor(scene, vehicleManager) {
        this.scene = scene;
        this.vehicleManager = vehicleManager;
        this.stats = {
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            totalLatency: 0,
            totalDataTransferred: 0,
            handoverCount: 0,
            networkStats: {
                DSRC: { sent: 0, received: 0, lost: 0 },
                WIFI: { sent: 0, received: 0, lost: 0 },
                LTE: { sent: 0, received: 0, lost: 0 }
            }
        };

        this.towers = {};
        this.communicationLines = new Map();
        this.ai = new BaseStationAI();
        
        // Initialize towers for each network type
        for (const [networkType, config] of Object.entries(CONFIG.NETWORK.TYPES)) {
            this.towers[networkType] = this.createTower(networkType, config);
        }
    }

    createTower(networkType, networkConfig) {
        let tower;
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const towerOffset = roadWidth / 2 + 10; // 10 units away from the road edge
        
        // Create different tower geometries based on network type
        switch(networkType) {
            case 'DSRC':
                tower = new THREE.Mesh(
                    new THREE.CylinderGeometry(1, 1, 15, 8),
                    new THREE.MeshPhongMaterial({ color: 0xff0000 }) // Red for DSRC
                );
                tower.position.set(-towerOffset, 7.5, 0);
                break;
            case 'WIFI':
                tower = new THREE.Mesh(
                    new THREE.CylinderGeometry(1, 1, 20, 8),
                    new THREE.MeshPhongMaterial({ color: 0x00ff00 }) // Green for WiFi
                );
                tower.position.set(towerOffset, 10, 0);
                break;
            case 'LTE':
                tower = new THREE.Mesh(
                    new THREE.BoxGeometry(3, 25, 3),
                    new THREE.MeshPhongMaterial({ color: 0x0000ff }) // Blue for LTE
                );
                tower.position.set(0, 12.5, -towerOffset);
                break;
        }
        
        this.scene.add(tower);
        return tower;
    }

    calculateSignalStrength(distance, networkType) {
        const networkParams = CONFIG.NETWORK.TYPES[networkType];
        if (distance <= networkParams.range) {
            return 1 - (distance / networkParams.range);
        } else if (distance <= CONFIG.NETWORK.MAX_TOTAL_RANGE) {
            const rangeDiff = CONFIG.NETWORK.MAX_TOTAL_RANGE - networkParams.range;
            const distanceBeyondRange = distance - networkParams.range;
            return Math.max(0, 1 - (distanceBeyondRange / rangeDiff));
        }
        return 0;
    }

    getStats() {
        const avgLatency = this.stats.packetsReceived > 0 
            ? this.stats.totalLatency / this.stats.packetsReceived 
            : 0;
        
        const totalDataKB = this.stats.totalDataTransferred > 0
            ? (this.stats.totalDataTransferred / 1024).toFixed(2)
            : '0.00';
        
        const stats = {
            ...this.stats,
            averageLatency: avgLatency.toFixed(2),
            totalDataKB: totalDataKB,
            handoverCount: this.stats.handoverCount
        };

        console.log('Network Stats:', {
            packetsSent: stats.packetsSent,
            packetsReceived: stats.packetsReceived,
            packetsLost: stats.packetsLost,
            averageLatency: stats.averageLatency,
            totalDataKB: stats.totalDataKB,
            handoverCount: stats.handoverCount,
            networkStats: stats.networkStats
        });

        return stats;
    }

    calculateEffectivePacketLossRate(distance, networkParams) {
        if (distance <= networkParams.range) {
            return networkParams.packetLossRate;
        } else if (distance <= CONFIG.NETWORK.MAX_TOTAL_RANGE) {
            const rangeDiff = CONFIG.NETWORK.MAX_TOTAL_RANGE - networkParams.range;
            if (rangeDiff <= 0) return 1;
            
            const distanceBeyondRange = distance - networkParams.range;
            const additionalLossFactor = distanceBeyondRange / rangeDiff;
            return Math.min(1, networkParams.packetLossRate + (1 - networkParams.packetLossRate) * additionalLossFactor);
        }
        return 1;
    }

    selectBestNetwork(vehicle) {
        // Get current state from AI
        const state = this.ai.getState(vehicle);
        
        // Get available networks based on vehicle position
        const availableNetworks = this.ai.getAvailableNetworks(vehicle);
        
        if (availableNetworks.length === 0) {
            console.log(`Vehicle ${vehicle.id}: No networks available`);
            return 'None';
        }
        
        // Choose action using AI
        const selectedNetwork = this.ai.chooseAction(state, availableNetworks);
        console.log(`Vehicle ${vehicle.id}: AI selected network ${selectedNetwork} from available networks: ${availableNetworks.join(', ')}`);
        
        // Update vehicle's current network
        vehicle.userData.currentNetwork = selectedNetwork;
        
        return selectedNetwork;
    }

    updateVehicleNetwork(vehicle, networkType) {
        const oldNetwork = vehicle.userData.currentNetwork;
        
        // If network changed, count it as a handover
        if (oldNetwork && oldNetwork !== networkType) {
            if (this.vehicleManager && typeof this.vehicleManager.incrementHandoverCount === 'function') {
                this.vehicleManager.incrementHandoverCount();
            }
            this.stats.handoverCount++;
        }
        
        // Update vehicle's network
        vehicle.userData.currentNetwork = networkType;
        
        // Update communication line
        this.updateCommunicationLine(vehicle);
    }

    updateCommunicationLine(vehicle) {
        // Remove old line if it exists
        if (this.communicationLines.has(vehicle.id)) {
            const oldLine = this.communicationLines.get(vehicle.id);
            this.scene.remove(oldLine);
        }

        // Create new line to appropriate tower
        const networkType = vehicle.userData.currentNetwork;
        if (networkType && this.towers[networkType]) {
            const tower = this.towers[networkType];
            const line = this.createCommunicationLine(vehicle, tower);
            this.communicationLines.set(vehicle.id, line);
            this.scene.add(line);
        }
    }

    createCommunicationLine(vehicle, tower) {
        const points = [
            vehicle.position.clone(),
            tower.position.clone().add(new THREE.Vector3(0, -15, 0))
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        return line;
    }

    update(deltaTime, currentTime) {
        // Update communication lines and handle packet transmission
        this.vehicleManager.vehicles.forEach(vehicle => {
            // Select best network for vehicle using AI
            const selectedNetwork = this.selectBestNetwork(vehicle);
            
            if (!selectedNetwork || selectedNetwork === 'None') {
                console.log(`Vehicle ${vehicle.id}: No network selected`);
                return;
            }

            const tower = this.towers[selectedNetwork];
            if (!tower) {
                console.log(`Vehicle ${vehicle.id}: No tower found for network ${selectedNetwork}`);
                return;
            }

            // Calculate distance to tower
            const distance = vehicle.position.distanceTo(tower.position);
            const networkParams = CONFIG.NETWORK.TYPES[selectedNetwork];

            // Check if it's time to send a packet (every 1 second)
            const lastPacketTime = vehicle.userData.lastPacketTime || 0;
            if (currentTime - lastPacketTime >= 1000) {
                // Calculate packet success based on distance and network parameters
                const packetLossRate = this.calculateEffectivePacketLossRate(distance, networkParams);
                const packetSuccess = Math.random() > packetLossRate;

                // Calculate latency
                const latency = this.calculateLatency(distance, selectedNetwork);

                // Update statistics
                this.stats.packetsSent++;
                this.stats.networkStats[selectedNetwork].sent++;

                if (packetSuccess) {
                    this.stats.packetsReceived++;
                    this.stats.networkStats[selectedNetwork].received++;
                    this.stats.totalLatency += latency;
                    this.stats.totalDataTransferred += CONFIG.NETWORK.PACKET_SIZE;
                } else {
                    this.stats.packetsLost++;
                    this.stats.networkStats[selectedNetwork].lost++;
                }

                // Update communication line color based on packet success
                const line = this.communicationLines.get(vehicle.id);
                if (line) {
                    line.material.color.set(packetSuccess ? 0x00ff00 : 0xff0000);
                }

                // Update AI with reward
                const reward = this.ai.calculateReward(packetSuccess, latency, distance);
                this.ai.learn(this.ai.getState(vehicle), selectedNetwork, reward);

                // Update last packet time
                vehicle.userData.lastPacketTime = currentTime;
            }

            // Update communication line positions
            const line = this.communicationLines.get(vehicle.id);
            if (line) {
                const points = [
                    vehicle.position.clone(),
                    tower.position.clone().add(new THREE.Vector3(0, -15, 0))
                ];
                line.geometry.setFromPoints(points);
            }
        });
    }

    calculateLatency(distance, networkType) {
        const networkParams = CONFIG.NETWORK.TYPES[networkType];
        const baseLatency = networkParams.latencyMs;
        const distanceFactor = distance / CONFIG.NETWORK.MAX_TOTAL_RANGE;
        return baseLatency * (1 + distanceFactor);
    }

    resetStats() {
        this.stats = {
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            totalLatency: 0,
            totalDataTransferred: 0,
            handoverCount: 0,
            networkStats: {
                DSRC: { sent: 0, received: 0, lost: 0 },
                WIFI: { sent: 0, received: 0, lost: 0 },
                LTE: { sent: 0, received: 0, lost: 0 }
            }
        };
    }

    clearAllCommunicationLines() {
        this.scene.traverse(object => {
            if (object instanceof THREE.Line) {
                this.scene.remove(object);
                object.geometry.dispose();
                object.material.dispose();
            }
        });
    }

    getAIEpsilon() {
        return this.ai.getEpsilon();
    }
} 