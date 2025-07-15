/**
 * EnhancedNetworkManager - Advanced network management with cloud-based AI
 * Features: Cloud-based decision making, safety message handling, periodic packet monitoring
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config/config.js';
import { BaseStationAI } from '../ai/BaseStationAI.js';
import { CloudAssessmentAI } from '../ai/CloudAssessmentAI.js';

export class EnhancedNetworkManager {
    constructor(scene, vehicleManager) {
        this.scene = scene;
        this.vehicleManager = vehicleManager;
        
        // Enhanced statistics with cloud monitoring
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
            },
            // Cloud-based monitoring stats
            cloudDecisions: 0,
            safetyMessages: 0,
            emergencyProtocols: 0,
            periodicAlerts: 0
        };

        this.communicationLines = new Map();
        this.ai = new BaseStationAI();
        this.cloudAI = new CloudAssessmentAI();
        
        // Periodic monitoring
        this.monitoringInterval = 5000; // 5 seconds
        this.lastMonitoringTime = Date.now();
        
        // Safety message tracking
        this.safetyMessageQueue = [];
        this.emergencyProtocols = new Map();
        
        // Create RSU and initialize
        this.createRSU();
        
        console.log('✅ EnhancedNetworkManager initialized with cloud-based AI and safety message handling');
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

    /**
     * Enhanced network selection with cloud-based AI
     */
    selectBestNetwork(vehicle) {
        const availableNetworks = this.ai.getAvailableNetworks(vehicle);
        
        if (availableNetworks.length === 0) {
            console.log(`Vehicle ${vehicle.id}: No networks available`);
            return 'None';
        }
        
        // Create context for cloud-based decision
        const context = {
            vehicleId: vehicle.userData.id,
            currentNetwork: vehicle.userData.currentNetwork,
            availableNetworks: availableNetworks,
            packetLoss: vehicle.userData.packetLossRate || 0,
            latency: vehicle.userData.averageLatency || 0,
            position: vehicle.position.clone(),
            speed: vehicle.userData.speed || 0
        };
        
        // Make cloud-based network optimization decision
        const cloudDecision = this.cloudAI.makeCloudDecision('NETWORK_OPTIMIZATION', context);
        this.stats.cloudDecisions++;
        
        // Use cloud decision if confidence is high, otherwise use local AI
        let selectedNetwork;
        if (cloudDecision.confidence > 0.7) {
            selectedNetwork = cloudDecision.action;
            console.log(`☁️ Cloud AI selected network ${selectedNetwork} (confidence: ${cloudDecision.confidence})`);
        } else {
            selectedNetwork = this.ai.selectBestNetwork(vehicle);
            console.log(`🤖 Local AI selected network ${selectedNetwork}`);
        }
        
        // Update vehicle's current network
        vehicle.userData.currentNetwork = selectedNetwork;
        
        return selectedNetwork;
    }

    /**
     * Enhanced packet transmission with safety message handling
     */
    transmitPacket(vehicle, currentTime) {
        const selectedNetwork = vehicle.userData.currentNetwork;
        if (!selectedNetwork || selectedNetwork === 'None') return;

        const distance = vehicle.position.distanceTo(this.rsuPosition);
        const networkParams = CONFIG.NETWORK.TYPES[selectedNetwork];
        
        // Calculate packet success and latency
        const packetLossRate = this.calculateEffectivePacketLossRate(distance, networkParams);
        const packetSuccess = Math.random() > packetLossRate;
        const latency = this.calculateLatency(distance, selectedNetwork);
        
        // Determine message type
        const messageType = this.determineMessageType(vehicle);
        const messageData = this.generateMessageData(vehicle, messageType);
        
        // Check if this is a safety message
        if (this.isSafetyMessage(messageType, messageData)) {
            this.handleSafetyMessage(vehicle, messageType, messageData);
        }
        
        // Update packet monitoring
        this.updatePacketMonitoring({
            vehicleId: vehicle.userData.id,
            networkType: selectedNetwork,
            success: packetSuccess,
            latency: latency,
            messageType: messageType,
            timestamp: currentTime
        });
        
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
        
        // Update communication line
        this.updateCommunicationLine(vehicle, packetSuccess);
        
        // Update AI learning
        const reward = this.calculateReward(packetSuccess, latency, distance, messageType);
        this.ai.learn(this.ai.getState(vehicle), selectedNetwork, reward);
        
        return {
            success: packetSuccess,
            latency: latency,
            networkType: selectedNetwork,
            messageType: messageType
        };
    }

    /**
     * Handle safety messages with special protocols
     */
    handleSafetyMessage(vehicle, messageType, messageData) {
        this.stats.safetyMessages++;
        
        // Use cloud AI for safety message handling
        const safetyDecision = this.cloudAI.handleSafetyMessage(vehicle, messageType, messageData);
        
        // Add to safety message queue
        this.safetyMessageQueue.push({
            id: `SAFETY_${Date.now()}`,
            vehicleId: vehicle.userData.id,
            messageType: messageType,
            messageData: messageData,
            decision: safetyDecision,
            timestamp: Date.now()
        });
        
        // Apply emergency protocols if needed
        if (safetyDecision.priority === 'HIGHEST' || safetyDecision.priority === 'CRITICAL') {
            this.stats.emergencyProtocols++;
            this.applyEmergencyProtocol(vehicle, safetyDecision);
        }
        
        console.log(`🚨 Safety message handled: ${messageType} from vehicle ${vehicle.userData.id}`);
    }

    /**
     * Apply emergency protocols
     */
    applyEmergencyProtocol(vehicle, safetyDecision) {
        const protocolId = `EMG_${vehicle.userData.id}_${Date.now()}`;
        
        const protocol = {
            id: protocolId,
            vehicleId: vehicle.userData.id,
            type: safetyDecision.emergency?.action?.type || 'STANDARD_EMERGENCY',
            affectedArea: safetyDecision.emergency?.action?.affectedArea || 200,
            notificationLevel: safetyDecision.emergency?.action?.notificationLevel || 'HIGH',
            responseTime: safetyDecision.emergency?.action?.responseTime || 2000,
            timestamp: Date.now(),
            active: true
        };
        
        this.emergencyProtocols.set(protocolId, protocol);
        
        // Trigger emergency broadcast
        this.broadcastEmergencyMessage(vehicle, protocol);
        
        console.log(`🚨 Emergency protocol activated: ${protocol.type} for vehicle ${vehicle.userData.id}`);
    }

    /**
     * Broadcast emergency message to nearby vehicles
     */
    broadcastEmergencyMessage(vehicle, protocol) {
        const affectedVehicles = this.vehicleManager.vehicles.filter(v => {
            const distance = v.position.distanceTo(vehicle.position);
            return distance <= protocol.affectedArea && v.id !== vehicle.id;
        });
        
        console.log(`📡 Emergency broadcast to ${affectedVehicles.length} vehicles`);
        
        // Simulate emergency message delivery
        affectedVehicles.forEach(affectedVehicle => {
            // Update affected vehicle with emergency information
            affectedVehicle.userData.emergencyAlert = {
                type: protocol.type,
                source: vehicle.userData.id,
                timestamp: Date.now(),
                priority: 'HIGH'
            };
        });
    }

    /**
     * Update packet monitoring with cloud AI
     */
    updatePacketMonitoring(packetData) {
        // Update cloud AI packet monitoring
        this.cloudAI.updatePacketMonitoring(packetData);
        
        // Update vehicle-specific stats
        const vehicleId = packetData.vehicleId;
        if (!this.vehicleManager.vehicles.find(v => v.userData.id === vehicleId)) return;
        
        const vehicle = this.vehicleManager.vehicles.find(v => v.userData.id === vehicleId);
        if (!vehicle) return;
        
        // Update vehicle packet statistics
        if (!vehicle.userData.packetStats) {
            vehicle.userData.packetStats = {
                total: 0,
                successful: 0,
                failed: 0,
                totalLatency: 0,
                averageLatency: 0,
                packetLossRate: 0
            };
        }
        
        const stats = vehicle.userData.packetStats;
        stats.total++;
        
        if (packetData.success) {
            stats.successful++;
            stats.totalLatency += packetData.latency;
        } else {
            stats.failed++;
        }
        
        stats.averageLatency = stats.totalLatency / stats.successful;
        stats.packetLossRate = stats.failed / stats.total;
    }

    /**
     * Perform periodic monitoring
     */
    performPeriodicMonitoring() {
        const currentTime = Date.now();
        
        if (currentTime - this.lastMonitoringTime >= this.monitoringInterval) {
            // Get cloud AI monitoring stats
            const cloudStats = this.cloudAI.getPacketMonitoringStats();
            
            // Check for alerts
            if (cloudStats.alerts && cloudStats.alerts.length > 0) {
                this.stats.periodicAlerts += cloudStats.alerts.length;
                console.log(`🚨 Periodic monitoring alerts: ${cloudStats.alerts.length} issues detected`);
                
                // Handle alerts
                cloudStats.alerts.forEach(alert => {
                    this.handleMonitoringAlert(alert);
                });
            }
            
            // Clean up old emergency protocols
            this.cleanupEmergencyProtocols();
            
            // Clean up old safety messages
            this.cleanupSafetyMessages();
            
            this.lastMonitoringTime = currentTime;
        }
    }

    /**
     * Handle monitoring alerts
     */
    handleMonitoringAlert(alert) {
        switch (alert.type) {
            case 'HIGH_PACKET_LOSS':
                console.log(`⚠️ High packet loss detected for vehicle ${alert.vehicleId}: ${(alert.value * 100).toFixed(1)}%`);
                break;
            case 'HIGH_LATENCY':
                console.log(`⚠️ High latency detected for vehicle ${alert.vehicleId}: ${alert.value.toFixed(1)}ms`);
                break;
            case 'HIGH_THROUGHPUT':
                console.log(`⚠️ High throughput detected: ${alert.value.toFixed(1)} packets/sec`);
                break;
        }
    }

    /**
     * Clean up old emergency protocols
     */
    cleanupEmergencyProtocols() {
        const currentTime = Date.now();
        const timeout = 30000; // 30 seconds
        
        for (const [protocolId, protocol] of this.emergencyProtocols) {
            if (currentTime - protocol.timestamp > timeout) {
                this.emergencyProtocols.delete(protocolId);
                console.log(`🧹 Cleaned up emergency protocol: ${protocolId}`);
            }
        }
    }

    /**
     * Clean up old safety messages
     */
    cleanupSafetyMessages() {
        const currentTime = Date.now();
        const timeout = 60000; // 1 minute
        
        this.safetyMessageQueue = this.safetyMessageQueue.filter(message => {
            return currentTime - message.timestamp < timeout;
        });
    }

    /**
     * Determine message type based on vehicle state
     */
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

    /**
     * Generate message data
     */
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

    /**
     * Check if message is a safety message
     */
    isSafetyMessage(messageType, messageData) {
        return messageType === 'SAFETY_MESSAGE' || 
               messageData.emergency || 
               messageData.critical || 
               messageData.warning;
    }

    /**
     * Calculate reward for AI learning
     */
    calculateReward(packetSuccess, latency, distance, messageType) {
        let reward = packetSuccess ? 10 : -15;
        
        // Adjust reward based on message type priority
        const messageConfig = CONFIG.MESSAGE_TYPES[messageType];
        if (messageConfig) {
            reward *= messageConfig.weight || 1.0;
        }
        
        // Penalize high latency
        reward -= latency / 100;
        
        // Penalize distance
        reward -= distance / 100;
        
        return reward;
    }

    /**
     * Enhanced update method
     */
    update(deltaTime, currentTime) {
        // Update communication lines and handle packet transmission
        this.vehicleManager.vehicles.forEach(vehicle => {
            // Select best network using cloud-based AI
            const selectedNetwork = this.selectBestNetwork(vehicle);
            
            if (!selectedNetwork || selectedNetwork === 'None') {
                return;
            }

            // Check if it's time to send a packet (every 1 second)
            const lastPacketTime = vehicle.userData.lastPacketTime || 0;
            if (currentTime - lastPacketTime >= 1000) {
                this.transmitPacket(vehicle, currentTime);
                vehicle.userData.lastPacketTime = currentTime;
            }

            // Update communication line positions
            this.updateCommunicationLinePosition(vehicle);
        });
        
        // Perform periodic monitoring
        this.performPeriodicMonitoring();
    }

    /**
     * Update communication line
     */
    updateCommunicationLine(vehicle, packetSuccess) {
        // Remove old line if it exists
        if (this.communicationLines.has(vehicle.id)) {
            const oldLine = this.communicationLines.get(vehicle.id);
            this.scene.remove(oldLine);
        }

        // Create new line
        const line = this.createCommunicationLine(vehicle);
        this.communicationLines.set(vehicle.id, line);
        this.scene.add(line);
        
        // Set color based on packet success
        line.material.color.set(packetSuccess ? 0x00ff00 : 0xff0000);
        line.material.opacity = packetSuccess ? 0.7 : 0.4;
    }

    /**
     * Update communication line position
     */
    updateCommunicationLinePosition(vehicle) {
        const line = this.communicationLines.get(vehicle.id);
        if (line && this.rsuPosition) {
            const points = [
                vehicle.position.clone(),
                this.rsuPosition.clone().add(new THREE.Vector3(0, -15, 0))
            ];
            line.geometry.setFromPoints(points);
        }
    }

    /**
     * Create communication line
     */
    createCommunicationLine(vehicle) {
        const points = [
            vehicle.position.clone(),
            this.rsuPosition.clone().add(new THREE.Vector3(0, -15, 0))
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            linewidth: 2,
            transparent: true,
            opacity: 0.7
        });
        return new THREE.Line(lineGeometry, lineMaterial);
    }

    /**
     * Calculate effective packet loss rate
     */
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

    /**
     * Calculate latency
     */
    calculateLatency(distance, networkType) {
        const networkParams = CONFIG.NETWORK.TYPES[networkType];
        const baseLatency = networkParams.latencyMs;
        const distanceFactor = distance / networkParams.range;
        return baseLatency * (1 + distanceFactor);
    }

    /**
     * Get enhanced statistics
     */
    getStats() {
        const avgLatency = this.stats.packetsReceived > 0 
            ? this.stats.totalLatency / this.stats.packetsReceived 
            : 0;
        
        const totalDataKB = this.stats.totalDataTransferred > 0
            ? (this.stats.totalDataTransferred / 1024).toFixed(2)
            : '0.00';
        
        // Get cloud AI monitoring stats
        const cloudStats = this.cloudAI.getPacketMonitoringStats();
        
        const stats = {
            ...this.stats,
            averageLatency: avgLatency.toFixed(2),
            totalDataKB: totalDataKB,
            handoverCount: this.stats.handoverCount,
            // Cloud-based stats
            cloudDecisions: this.stats.cloudDecisions,
            safetyMessages: this.stats.safetyMessages,
            emergencyProtocols: this.stats.emergencyProtocols,
            periodicAlerts: this.stats.periodicAlerts,
            // Cloud monitoring stats
            cloudMonitoring: cloudStats,
            activeEmergencyProtocols: this.emergencyProtocols.size,
            safetyMessageQueueSize: this.safetyMessageQueue.length
        };

        return stats;
    }

    /**
     * Reset statistics
     */
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
            },
            cloudDecisions: 0,
            safetyMessages: 0,
            emergencyProtocols: 0,
            periodicAlerts: 0
        };
        
        // Reset cloud AI
        this.cloudAI.reset();
        
        // Clear queues
        this.safetyMessageQueue = [];
        this.emergencyProtocols.clear();
    }

    /**
     * Clear all communication lines
     */
    clearAllCommunicationLines() {
        this.communicationLines.forEach(line => {
            this.scene.remove(line);
        });
        this.communicationLines.clear();
    }

    /**
     * Get AI epsilon
     */
    getAIEpsilon() {
        return this.ai.getEpsilon();
    }
} 