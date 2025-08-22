import * as THREE from 'https://cdn.skypack.dev/three@0.160.0';
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

        this.communicationLines = new Map();
        this.ai = new BaseStationAI();
        
        // Create single RSU with range indicators
        this.createRSU();
    }

    createRSU() {
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const rsuOffset = roadWidth / 2 + CONFIG.BASE_STATION.POSITION_X_OFFSET;
        
        // Create RSU pole
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
        const poleMaterial = new THREE.MeshPhongMaterial({
            color: 0x7f8c8d,
            shininess: 30,
            specular: 0x444444
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(rsuOffset, 2, 0);
        pole.castShadow = true;
        this.scene.add(pole);

        // Create RSU unit
        const rsuGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
        const rsuMaterial = new THREE.MeshPhongMaterial({
            color: 0x34495e,
            shininess: 50,
            specular: 0x666666
        });
        const rsu = new THREE.Mesh(rsuGeometry, rsuMaterial);
        rsu.position.set(rsuOffset, 4.25, 0);
        rsu.castShadow = true;
        this.scene.add(rsu);

        // Create antenna
        const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        const antennaMaterial = new THREE.MeshPhongMaterial({
            color: 0x95a5a6,
            shininess: 50,
            specular: 0x666666
        });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(rsuOffset, 5, 0);
        antenna.castShadow = true;
        this.scene.add(antenna);

        // Store RSU position for network calculations
        this.rsuPosition = new THREE.Vector3(rsuOffset, 0.1, 0);

        // Create network range indicators (concentric circles)
        for (const [networkType, config] of Object.entries(CONFIG.NETWORK.TYPES)) {
            const rangeGeometry = new THREE.RingGeometry(
                config.range - 0.5,
                config.range + 0.5,
                64
            );
            const rangeMaterial = new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial);
            rangeIndicator.rotation.x = -Math.PI / 2;
            rangeIndicator.position.copy(this.rsuPosition);
            rangeIndicator.userData = {
                networkType: networkType,
                baseOpacity: 0.3,
                pulseSpeed: 0.5 + Math.random() * 0.5,
                pulsePhase: Math.random() * Math.PI * 2
            };
            this.scene.add(rangeIndicator);
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
        if (networkType && this.rsuPosition) {
            const line = this.createCommunicationLine(vehicle, this.rsuPosition);
            this.communicationLines.set(vehicle.id, line);
            this.scene.add(line);
        }
    }

    createCommunicationLine(vehicle, tower) {
        const points = [
            vehicle.position.clone(),
            tower.clone().add(new THREE.Vector3(0, -15, 0))
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,  // Default to green for successful communication
            linewidth: 2,
            transparent: true,
            opacity: 0.7
        });
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

            const tower = this.rsuPosition;
            if (!tower) {
                console.log(`Vehicle ${vehicle.id}: No tower found for network ${selectedNetwork}`);
                return;
            }

            // Calculate distance to tower
            const distance = vehicle.position.distanceTo(tower);
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
                    line.material.opacity = packetSuccess ? 0.7 : 0.4; // Make failed packets more transparent
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
                    tower.clone().add(new THREE.Vector3(0, -15, 0))
                ];
                line.geometry.setFromPoints(points);
            }
        });
    }

    calculateLatency(distance, networkType) {
        const networkParams = CONFIG.NETWORK.TYPES[networkType];
        const baseLatency = networkParams.baseLatency;
        const distanceFactor = distance / networkParams.range;
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
        this.communicationLines.forEach(line => {
            this.scene.remove(line);
        });
        this.communicationLines.clear();
    }

    getAIEpsilon() {
        return this.ai.epsilon;
    }
} 