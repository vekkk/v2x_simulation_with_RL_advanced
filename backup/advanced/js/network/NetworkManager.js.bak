import * as THREE from 'three';
import { CONFIG } from '../config/config.js';

export class NetworkManager {
    constructor(scene, tower) {
        this.scene = scene;
        this.tower = tower;
        this.stats = {
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0
        };
    }

    getStats() {
        return { ...this.stats };
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

    selectNetwork(vehiclePosition) {
        const distanceToBaseStation = vehiclePosition.distanceTo(this.tower.position);
        let bestNetworkType = null;
        let bestNetworkScore = -Infinity;

        const networkPreferenceOrder = ['DSRC', 'WIFI', 'LTE'];

        for (const netTypeKey of networkPreferenceOrder) {
            const netParams = CONFIG.NETWORK.TYPES[netTypeKey];
            
            if (distanceToBaseStation <= netParams.range) {
                const currentScore = -netParams.latencyMs - (netParams.packetLossRate * 1000);
                
                if (currentScore > bestNetworkScore) {
                    bestNetworkScore = currentScore;
                    bestNetworkType = netTypeKey;
                }
            } else if (distanceToBaseStation <= CONFIG.NETWORK.MAX_TOTAL_RANGE && netTypeKey === 'LTE') {
                const effectiveLoss = this.calculateEffectivePacketLossRate(distanceToBaseStation, netParams);
                const currentScore = -netParams.latencyMs - (effectiveLoss * 1000) - 100;
                if (currentScore > bestNetworkScore) {
                    bestNetworkScore = currentScore;
                    bestNetworkType = netTypeKey;
                }
            }
        }
        return bestNetworkType;
    }

    showCommunicationLine(vehicle, color) {
        if (vehicle.userData.communicationLine) {
            this.scene.remove(vehicle.userData.communicationLine);
            vehicle.userData.communicationLine.geometry.dispose();
            vehicle.userData.communicationLine.material.dispose();
            vehicle.userData.communicationLine = null;
        }

        const points = [
            vehicle.position.clone(),
            this.tower.position.clone().add(new THREE.Vector3(0, -15, 0))
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ color: color });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(line);
        vehicle.userData.communicationLine = line;

        setTimeout(() => {
            if (vehicle.userData.communicationLine === line) {
                this.scene.remove(line);
                line.geometry.dispose();
                line.material.dispose();
                vehicle.userData.communicationLine = null;
            }
        }, CONFIG.NETWORK.COMMUNICATION_LINE_DURATION);
    }

    update(deltaTime, currentTime) {
        // Update network communication for all vehicles
        this.scene.traverse(object => {
            if (object instanceof THREE.Mesh && object.userData && object.userData.type && object.userData.id !== undefined) {
                this.attemptCommunication(object, currentTime);
            }
        });
    }

    attemptCommunication(vehicle, currentTime) {
        if (currentTime - vehicle.userData.lastPacketTime < CONFIG.VEHICLES.PACKET_SEND_INTERVAL) {
            return;
        }

        const chosenNetworkType = this.selectNetwork(vehicle.position);
        vehicle.userData.currentNetwork = chosenNetworkType || 'None';

        if (!chosenNetworkType) {
            this.stats.packetsSent++;
            this.stats.packetsLost++;
            return;
        }

        const networkParams = CONFIG.NETWORK.TYPES[chosenNetworkType];
        const distance = vehicle.position.distanceTo(this.tower.position);
        const packetLossRate = this.calculateEffectivePacketLossRate(distance, networkParams);
        const isPacketLost = Math.random() < packetLossRate;

        this.stats.packetsSent++;
        vehicle.userData.lastPacketTime = currentTime;

        setTimeout(() => {
            if (isPacketLost) {
                this.stats.packetsLost++;
                this.showCommunicationLine(vehicle, 0xff0000);
            } else {
                this.stats.packetsReceived++;
                this.showCommunicationLine(vehicle, networkParams.color);
            }
        }, networkParams.latencyMs);
    }

    resetStats() {
        this.stats.packetsSent = 0;
        this.stats.packetsReceived = 0;
        this.stats.packetsLost = 0;
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
} 