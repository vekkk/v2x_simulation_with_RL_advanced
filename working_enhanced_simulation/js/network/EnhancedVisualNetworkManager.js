import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config/config.js';
import { BaseStationAI } from '../ai/BaseStationAI.js';

export class EnhancedVisualNetworkManager {
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
            safetyMessages: 0,
            emergencyProtocols: 0,
            cloudDecisions: 0,
            networkStats: {
                DSRC: { sent: 0, received: 0, lost: 0 },
                WIFI: { sent: 0, received: 0, lost: 0 },
                LTE: { sent: 0, received: 0, lost: 0 }
            }
        };

        this.communicationLines = new Map();
        this.messageParticles = new Map();
        this.ai = new BaseStationAI();
        this.slowMotionFactor = 0.3; // Slow motion factor
        this.messageQueue = [];
        this.activeMessages = new Map();
        
        // Create RSU and base station
        this.createRSU();
        this.createBaseStation();
        
        // Message type colors
        this.messageColors = {
            SAFETY_MESSAGE: 0xff0000,      // Red
            BASIC_CAM_MESSAGE: 0x00ff00,   // Green
            TRAFFIC_MESSAGE: 0xff8800,     // Orange
            INFOTAINMENT_MESSAGE: 0x0088ff // Blue
        };
        
        console.log('🚀 Enhanced Visual Network Manager initialized with slow motion');
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

        // Store RSU position
        this.rsuPosition = new THREE.Vector3(rsuOffset, 0.1, 0);

        // Create network range indicators
        for (const [networkType, config] of Object.entries(CONFIG.NETWORK.TYPES)) {
            const rangeGeometry = new THREE.RingGeometry(
                config.range - 0.5,
                config.range + 0.5,
                64
            );
            const rangeMaterial = new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            });
            const rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial);
            rangeIndicator.rotation.x = -Math.PI / 2;
            rangeIndicator.position.copy(this.rsuPosition);
            rangeIndicator.userData = {
                networkType: networkType,
                baseOpacity: 0.2,
                pulseSpeed: 0.3 + Math.random() * 0.3,
                pulsePhase: Math.random() * Math.PI * 2
            };
            this.scene.add(rangeIndicator);
        }
    }

    createBaseStation() {
        const roadWidth = CONFIG.ROAD.LANE_WIDTH * CONFIG.ROAD.NUM_LANES;
        const baseOffset = roadWidth / 2 + CONFIG.BASE_STATION.POSITION_X_OFFSET;
        
        // Create base station tower
        const towerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 8, 8);
        const towerMaterial = new THREE.MeshPhongMaterial({
            color: 0x2c3e50,
            shininess: 30,
            specular: 0x444444
        });
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.set(baseOffset, 4, 50);
        tower.castShadow = true;
        this.scene.add(tower);

        // Create base station equipment
        const equipmentGeometry = new THREE.BoxGeometry(2, 1, 1);
        const equipmentMaterial = new THREE.MeshPhongMaterial({
            color: 0x34495e,
            shininess: 50,
            specular: 0x666666
        });
        const equipment = new THREE.Mesh(equipmentGeometry, equipmentMaterial);
        equipment.position.set(baseOffset, 8.5, 50);
        equipment.castShadow = true;
        this.scene.add(equipment);

        // Store base station position
        this.baseStationPosition = new THREE.Vector3(baseOffset, 0.1, 50);
    }

    determineMessageType(vehicle) {
        // Simulate different message types based on vehicle behavior
        const rand = Math.random();
        
        if (vehicle.userData.emergencyAlert) {
            return 'SAFETY_MESSAGE';
        } else if (rand < 0.6) {
            return 'BASIC_CAM_MESSAGE';
        } else if (rand < 0.8) {
            return 'TRAFFIC_MESSAGE';
        } else {
            return 'INFOTAINMENT_MESSAGE';
        }
    }

    generateMessageData(vehicle, messageType) {
        const baseData = {
            vehicleId: vehicle.userData.id,
            position: vehicle.position.clone(),
            speed: vehicle.userData.speed || 0,
            timestamp: Date.now()
        };
        
        switch (messageType) {
            case 'SAFETY_MESSAGE':
                return {
                    ...baseData,
                    emergency: true,
                    critical: Math.random() < 0.3,
                    warning: Math.random() < 0.5,
                    hazard: Math.random() < 0.4
                };
            case 'BASIC_CAM_MESSAGE':
                return {
                    ...baseData,
                    heading: vehicle.userData.heading || 0,
                    acceleration: vehicle.userData.acceleration || 0
                };
            case 'TRAFFIC_MESSAGE':
                return {
                    ...baseData,
                    trafficCondition: 'NORMAL',
                    congestionLevel: Math.random()
                };
            case 'INFOTAINMENT_MESSAGE':
                return {
                    ...baseData,
                    contentType: 'ENTERTAINMENT',
                    priority: 'LOW'
                };
            default:
                return baseData;
        }
    }

    createMessageParticle(vehicle, messageType, target) {
        const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: this.messageColors[messageType],
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(vehicle.position);
        particle.userData = {
            messageType: messageType,
            startPosition: vehicle.position.clone(),
            targetPosition: target.clone(),
            startTime: Date.now(),
            duration: 3000 * this.slowMotionFactor, // 3 seconds in slow motion
            vehicleId: vehicle.userData.id
        };
        
        this.scene.add(particle);
        return particle;
    }

    updateMessageParticles(deltaTime) {
        const currentTime = Date.now();
        
        for (const [messageId, particle] of this.activeMessages.entries()) {
            const elapsed = currentTime - particle.userData.startTime;
            const progress = elapsed / particle.userData.duration;
            
            if (progress >= 1) {
                // Message reached destination
                this.scene.remove(particle);
                this.activeMessages.delete(messageId);
                
                // Update stats
                this.stats.packetsReceived++;
                const networkType = particle.userData.networkType;
                this.stats.networkStats[networkType].received++;
                
                console.log(`📨 Message ${particle.userData.messageType} from vehicle ${particle.userData.vehicleId} received via ${networkType}`);
                
            } else {
                // Update particle position
                const startPos = particle.userData.startPosition;
                const targetPos = particle.userData.targetPosition;
                
                particle.position.lerpVectors(startPos, targetPos, progress);
                
                // Add some wave motion
                particle.position.y += Math.sin(progress * Math.PI * 4) * 0.2;
                
                // Pulse effect for safety messages
                if (particle.userData.messageType === 'SAFETY_MESSAGE') {
                    particle.material.opacity = 0.8 + Math.sin(progress * Math.PI * 8) * 0.2;
                    particle.scale.setScalar(1 + Math.sin(progress * Math.PI * 6) * 0.1);
                }
            }
        }
    }

    selectBestNetwork(vehicle) {
        const availableNetworks = this.ai.getAvailableNetworks(vehicle);
        
        if (availableNetworks.length === 0) {
            return 'None';
        }
        
        // Simulate cloud AI decision
        const cloudConfidence = Math.random();
        let selectedNetwork;
        
        if (cloudConfidence > 0.7) {
            // Cloud AI decision
            selectedNetwork = availableNetworks[Math.floor(Math.random() * availableNetworks.length)];
            this.stats.cloudDecisions++;
            console.log(`☁️ Cloud AI selected ${selectedNetwork} (confidence: ${cloudConfidence.toFixed(2)})`);
        } else {
            // Local AI decision
            selectedNetwork = this.ai.selectBestNetwork(vehicle);
            console.log(`🤖 Local AI selected ${selectedNetwork}`);
        }
        
        vehicle.userData.currentNetwork = selectedNetwork;
        return selectedNetwork;
    }

    transmitMessage(vehicle, currentTime) {
        const selectedNetwork = vehicle.userData.currentNetwork;
        if (!selectedNetwork || selectedNetwork === 'None') return;

        // Determine message type
        const messageType = this.determineMessageType(vehicle);
        const messageData = this.generateMessageData(vehicle, messageType);
        
        // Update stats
        this.stats.packetsSent++;
        this.stats.networkStats[selectedNetwork].sent++;
        
        if (messageType === 'SAFETY_MESSAGE') {
            this.stats.safetyMessages++;
            console.log(`🚨 SAFETY MESSAGE from vehicle ${vehicle.userData.id}`);
        }
        
        // Determine target based on message type and network
        let target;
        if (messageType === 'SAFETY_MESSAGE') {
            // Safety messages go to both RSU and base station
            target = Math.random() < 0.7 ? this.rsuPosition : this.baseStationPosition;
        } else if (messageType === 'INFOTAINMENT_MESSAGE') {
            // Infotainment goes directly to base station
            target = this.baseStationPosition;
        } else {
            // Others go to RSU
            target = this.rsuPosition;
        }
        
        // Create visual message particle
        const messageId = `MSG_${vehicle.userData.id}_${currentTime}`;
        const particle = this.createMessageParticle(vehicle, messageType, target);
        particle.userData.networkType = selectedNetwork;
        this.activeMessages.set(messageId, particle);
        
        // Simulate packet loss
        const distance = vehicle.position.distanceTo(target);
        const networkParams = CONFIG.NETWORK.TYPES[selectedNetwork];
        const packetLossRate = this.calculateEffectivePacketLossRate(distance, networkParams);
        
        if (Math.random() < packetLossRate) {
            // Packet lost
            this.stats.packetsLost++;
            this.stats.networkStats[selectedNetwork].lost++;
            
            // Remove particle after a short delay
            setTimeout(() => {
                if (this.activeMessages.has(messageId)) {
                    this.scene.remove(particle);
                    this.activeMessages.delete(messageId);
                }
            }, 1000 * this.slowMotionFactor);
            
            console.log(`❌ Message ${messageType} from vehicle ${vehicle.userData.id} LOST via ${selectedNetwork}`);
        }
        
        // Update communication line
        this.updateCommunicationLine(vehicle, selectedNetwork);
        
        return {
            success: Math.random() > packetLossRate,
            messageType: messageType,
            networkType: selectedNetwork
        };
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

    updateCommunicationLine(vehicle, networkType) {
        // Remove old line if it exists
        if (this.communicationLines.has(vehicle.id)) {
            const oldLine = this.communicationLines.get(vehicle.id);
            this.scene.remove(oldLine);
        }

        // Create new communication line
        const target = networkType === 'LTE' ? this.baseStationPosition : this.rsuPosition;
        const line = this.createCommunicationLine(vehicle, target, networkType);
        this.communicationLines.set(vehicle.id, line);
    }

    createCommunicationLine(vehicle, target, networkType) {
        const points = [
            vehicle.position.clone(),
            target.clone()
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: CONFIG.NETWORK.TYPES[networkType].color,
            transparent: true,
            opacity: 0.6
        });
        
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        
        // Animate the line
        line.userData = {
            startTime: Date.now(),
            duration: 2000 * this.slowMotionFactor,
            networkType: networkType
        };
        
        return line;
    }

    update(deltaTime, currentTime) {
        // Slow down the simulation
        const slowDeltaTime = deltaTime * this.slowMotionFactor;
        
        // Update message particles
        this.updateMessageParticles(slowDeltaTime);
        
        // Update communication lines
        this.updateCommunicationLines(slowDeltaTime);
        
        // Update range indicators
        this.updateRangeIndicators(slowDeltaTime);
        
        // Process vehicle messages (slower frequency)
        this.vehicleManager.vehicles.forEach(vehicle => {
            const lastPacketTime = vehicle.userData.lastPacketTime || 0;
            const sendInterval = 2000 * this.slowMotionFactor; // 2 seconds in slow motion
            
            if (currentTime - lastPacketTime >= sendInterval) {
                // Select network
                const selectedNetwork = this.selectBestNetwork(vehicle);
                
                if (selectedNetwork && selectedNetwork !== 'None') {
                    // Transmit message
                    this.transmitMessage(vehicle, currentTime);
                    vehicle.userData.lastPacketTime = currentTime;
                }
            }
        });
    }

    updateCommunicationLines(deltaTime) {
        const currentTime = Date.now();
        
        for (const [vehicleId, line] of this.communicationLines.entries()) {
            const elapsed = currentTime - line.userData.startTime;
            const progress = elapsed / line.userData.duration;
            
            if (progress >= 1) {
                // Remove old line
                this.scene.remove(line);
                this.communicationLines.delete(vehicleId);
            } else {
                // Fade out effect
                line.material.opacity = 0.6 * (1 - progress);
            }
        }
    }

    updateRangeIndicators(deltaTime) {
        this.scene.children.forEach(child => {
            if (child.userData && child.userData.networkType) {
                const time = Date.now() * 0.001;
                const pulseSpeed = child.userData.pulseSpeed;
                const pulsePhase = child.userData.pulsePhase;
                
                child.material.opacity = child.userData.baseOpacity + 
                    Math.sin(time * pulseSpeed + pulsePhase) * 0.1;
            }
        });
    }

    getStats() {
        const avgLatency = this.stats.packetsReceived > 0 
            ? this.stats.totalLatency / this.stats.packetsReceived 
            : 0;
        
        const totalDataKB = this.stats.totalDataTransferred > 0
            ? (this.stats.totalDataTransferred / 1024).toFixed(2)
            : '0.00';
        
        return {
            ...this.stats,
            averageLatency: avgLatency.toFixed(2),
            totalDataKB: totalDataKB,
            handoverCount: this.stats.handoverCount,
            safetyMessages: this.stats.safetyMessages,
            emergencyProtocols: this.stats.emergencyProtocols,
            cloudDecisions: this.stats.cloudDecisions
        };
    }

    resetStats() {
        this.stats = {
            packetsSent: 0,
            packetsReceived: 0,
            packetsLost: 0,
            totalLatency: 0,
            totalDataTransferred: 0,
            handoverCount: 0,
            safetyMessages: 0,
            emergencyProtocols: 0,
            cloudDecisions: 0,
            networkStats: {
                DSRC: { sent: 0, received: 0, lost: 0 },
                WIFI: { sent: 0, received: 0, lost: 0 },
                LTE: { sent: 0, received: 0, lost: 0 }
            }
        };
        
        // Clear all visual elements
        this.clearAllCommunicationLines();
        this.clearAllMessageParticles();
    }

    clearAllCommunicationLines() {
        for (const line of this.communicationLines.values()) {
            this.scene.remove(line);
        }
        this.communicationLines.clear();
    }

    clearAllMessageParticles() {
        for (const particle of this.activeMessages.values()) {
            this.scene.remove(particle);
        }
        this.activeMessages.clear();
    }

    getAIEpsilon() {
        return this.ai.epsilon;
    }
} 