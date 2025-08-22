import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
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
        
        // Initialize baseStationPosition as a new Vector3
        this.baseStationPosition = new THREE.Vector3();
    }

    updateBaseStationPosition(sceneManager) {
        if (sceneManager && sceneManager.baseStationPosition) {
            this.baseStationPosition.copy(sceneManager.baseStationPosition);
            console.log('Base station position updated:', this.baseStationPosition);
        } else {
            console.warn('Could not update base station position - sceneManager or baseStationPosition is undefined');
        }
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
            averageLatency: avgLatency,
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
        // Use the new AI's update method to select the best network
        const selectedNetwork = this.ai.update(vehicle);
        
        if (!selectedNetwork) {
            console.log(`Vehicle ${vehicle.id}: No network selected`);
            return 'None';
        }
        
        console.log(`Vehicle ${vehicle.id}: Selected network: ${selectedNetwork}`);
        
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
        // Update base station position from SceneManager
        const sceneManager = this.scene.userData.sceneManager;
        if (sceneManager && sceneManager.baseStationPosition) {
            this.baseStationPosition.copy(sceneManager.baseStationPosition);
        }

        // Update communication lines and handle packet transmission
        this.vehicleManager.vehicles.forEach(vehicle => {
            // Select best network for vehicle using AI
            const selectedNetwork = this.selectBestNetwork(vehicle);
            
            if (!selectedNetwork || selectedNetwork === 'None') {
                console.log(`Vehicle ${vehicle.id}: No network selected`);
                return;
            }

            // Calculate distance to base station
            const distance = vehicle.position.distanceTo(this.baseStationPosition);
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

                // Update last packet time
                vehicle.userData.lastPacketTime = currentTime;
            }

            // Update communication line positions
            const line = this.communicationLines.get(vehicle.id);
            if (line) {
                const points = [
                    vehicle.position.clone(),
                    this.baseStationPosition.clone().add(new THREE.Vector3(0, 15, 0))
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

    getAILearningProgress() {
        return this.ai ? this.ai.getLearningProgress() : 0;
    }
} 