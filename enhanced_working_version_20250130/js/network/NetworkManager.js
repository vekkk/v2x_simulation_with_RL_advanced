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

        this.towers = {};
        this.communicationLines = new Map();
        this.ai = new BaseStationAI();
        
        // Initialize baseStationPosition as a new Vector3
        this.baseStationPosition = new THREE.Vector3(0, 0, 0);
        
        // Initialize RSU positions array
        this.rsuPositions = [];
        
        // Initialize PlotManager for analytics
        this.plotManager = null;
        
        // Initialize ProcessingManager for task processing
        this.processingManager = null;
        
        // Signal strength multiplier for interactive control
        this.signalStrengthMultiplier = 1.0;
        
        console.log('NetworkManager initialized with AI, analytics, and RSU support');
    }

    // Set PlotManager reference (called from SimulationManager)
    setPlotManager(plotManager) {
        this.plotManager = plotManager;
        console.log('PlotManager integrated with NetworkManager');
    }

    // Set ProcessingManager reference (called from SimulationManager)
    setProcessingManager(processingManager) {
        this.processingManager = processingManager;
        console.log('ProcessingManager integrated with NetworkManager');
    }

    // Set RSU positions from SceneManager
    setRSUPositions(rsuPositions) {
        this.rsuPositions = rsuPositions;
        console.log('RSU positions set:', this.rsuPositions.length, 'RSUs available');
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
        let baseStrength = 0;
        
        if (distance <= networkParams.range) {
            baseStrength = 1 - (distance / networkParams.range);
        } else if (distance <= CONFIG.NETWORK.MAX_TOTAL_RANGE) {
            const rangeDiff = CONFIG.NETWORK.MAX_TOTAL_RANGE - networkParams.range;
            const distanceBeyondRange = distance - networkParams.range;
            baseStrength = Math.max(0, 1 - (distanceBeyondRange / rangeDiff));
        }
        
        // Apply signal strength multiplier
        return Math.min(1.0, baseStrength * this.signalStrengthMultiplier);
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

    // Find the closest RSU to a vehicle
    findClosestRSU(vehiclePosition) {
        if (this.rsuPositions.length === 0) {
            return null;
        }

        let closestRSU = null;
        let minDistance = Infinity;

        this.rsuPositions.forEach(rsu => {
            const distance = vehiclePosition.distanceTo(rsu.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestRSU = rsu;
            }
        });

        return { rsu: closestRSU, distance: minDistance };
    }

    // Determine the best communication path (direct to base station or via RSU)
    selectCommunicationPath(vehicle) {
        const vehiclePos = vehicle.position;
        
        // Calculate direct distance to base station
        const directDistance = vehiclePos.distanceTo(this.baseStationPosition);
        
        // Find closest RSU
        const closestRSUInfo = this.findClosestRSU(vehiclePos);
        
        if (!closestRSUInfo) {
            // No RSUs available, use direct communication
            return {
                type: 'direct',
                target: this.baseStationPosition,
                distance: directDistance
            };
        }

        const rsuDistance = closestRSUInfo.distance;
        const rsuToBaseDistance = closestRSUInfo.rsu.position.distanceTo(this.baseStationPosition);
        const totalRSUDistance = rsuDistance + rsuToBaseDistance;

        // Use RSU if it provides better connectivity (shorter total distance or within RSU range)
        if (rsuDistance <= 60 && totalRSUDistance < directDistance * 1.2) { // 60m RSU range, 20% tolerance
            return {
                type: 'rsu',
                target: closestRSUInfo.rsu.position,
                distance: rsuDistance,
                totalDistance: totalRSUDistance,
                rsu: closestRSUInfo.rsu
            };
        } else {
            return {
                type: 'direct',
                target: this.baseStationPosition,
                distance: directDistance
            };
        }
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
                console.log(`Vehicle ${vehicle.userData.id}: No network selected`);
                return;
            }

            // Get message type and config from AI
            const messageType = vehicle.userData.currentMessageType || 'BASIC_CAM_MESSAGE';
            const messageConfig = vehicle.userData.messageConfig || CONFIG.MESSAGE_TYPES.BASIC_CAM_MESSAGE;

            // Select best communication path (direct or via RSU)
            const commPath = this.selectCommunicationPath(vehicle);
            const networkParams = CONFIG.NETWORK.TYPES[selectedNetwork];

            // Check if it's time to send a packet based on message frequency
            const lastPacketTime = vehicle.userData.lastPacketTime || 0;
            const sendInterval = messageConfig.frequency || 1000; // Use message-specific frequency
            
            if (currentTime - lastPacketTime >= sendInterval) {
                // Calculate packet success based on communication path
                let packetLossRate;
                let effectiveDistance;
                
                if (commPath.type === 'rsu') {
                    // RSU communication has much better success rate
                    effectiveDistance = commPath.distance;
                    // RSUs provide better connectivity, reduce packet loss significantly
                    packetLossRate = this.calculateEffectivePacketLossRate(effectiveDistance, networkParams) * 0.3; // 70% improvement via RSU
                } else {
                    // Direct communication to base station
                    effectiveDistance = commPath.distance;
                    packetLossRate = this.calculateEffectivePacketLossRate(effectiveDistance, networkParams);
                }
                
                const packetSuccess = Math.random() > packetLossRate;

                // Calculate latency with communication path consideration
                const latency = this.calculateLatency(effectiveDistance, selectedNetwork, messageType, commPath.type);

                // Create packet visualization with correct target
                this.createPacketVisualization(vehicle, messageType, selectedNetwork, packetSuccess, commPath);

                // Update statistics
                this.stats.packetsSent++;
                this.stats.networkStats[selectedNetwork].sent++;

                if (packetSuccess) {
                    this.stats.packetsReceived++;
                    this.stats.networkStats[selectedNetwork].received++;
                    this.stats.totalLatency += latency;
                    this.stats.totalDataTransferred += messageConfig.size; // Use message-specific size
                    
                    // Submit processing task if ProcessingManager is available
                    if (this.processingManager) {
                        this.submitProcessingTask(vehicle, messageType, commPath, selectedNetwork);
                    }
                } else {
                    this.stats.packetsLost++;
                    this.stats.networkStats[selectedNetwork].lost++;
                }

                // Provide feedback to AI for reinforcement learning
                this.ai.updateReward(vehicle, selectedNetwork, packetSuccess, latency, effectiveDistance);

                // Record data for analytics if PlotManager is available
                if (this.plotManager) {
                    this.plotManager.recordPacketTransmission(
                        messageType, 
                        selectedNetwork, 
                        packetSuccess, 
                        latency, 
                        this.ai.lastReward || 0
                    );
                }

                // Update vehicle's last packet time
                vehicle.userData.lastPacketTime = currentTime;

                // Update network assignment and communication line
                this.updateVehicleNetwork(vehicle, selectedNetwork);
                
                console.log(`Vehicle ${vehicle.userData.id}: Sent ${messageType} via ${selectedNetwork} (${commPath.type}) - Success: ${packetSuccess}, Latency: ${latency}ms, Distance: ${effectiveDistance.toFixed(1)}m`);
            }
        });

        // Update communication line animations
        this.updateCommunicationLines();
    }

    createPacketVisualization(vehicle, messageType, networkType, success, commPath) {
        const messageConfig = CONFIG.MESSAGE_TYPES[messageType];
        const networkConfig = CONFIG.NETWORK.TYPES[networkType];
        
        // Create packet indicator above vehicle
        const packetGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const packetMaterial = new THREE.MeshBasicMaterial({
            color: success ? messageConfig.color : 0xff0000, // Red if failed
            transparent: true,
            opacity: 0.8
        });
        
        const packet = new THREE.Mesh(packetGeometry, packetMaterial);
        packet.position.copy(vehicle.position);
        packet.position.y += 3; // Above vehicle
        
        // Add message type label
        this.addMessageTypeLabel(packet, messageType, messageConfig);
        
        // Animate packet towards base station
        this.animatePacket(packet, vehicle.position.clone(), commPath.target.clone(), success, networkType);
        
        this.scene.add(packet);
    }

    addMessageTypeLabel(packet, messageType, messageConfig) {
        // Create text sprite for message type
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 32;
        
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000000';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText(messageConfig.id, canvas.width / 2, 20);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 0.5, 1);
        sprite.position.set(0, 1, 0);
        
        packet.add(sprite);
    }

    animatePacket(packet, startPos, endPos, success, networkType) {
        const duration = 1000; // 1 second animation
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Interpolate position
            packet.position.lerpVectors(startPos, endPos, progress);
            
            // Add some arc to the movement
            packet.position.y += Math.sin(progress * Math.PI) * 5;
            
            // Fade out as it approaches destination
            packet.material.opacity = 0.8 * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove packet when animation completes
                this.scene.remove(packet);
                packet.geometry.dispose();
                packet.material.dispose();
                
                // Create arrival effect at base station
                this.createArrivalEffect(endPos, success, networkType);
            }
        };
        
        animate();
    }

    createArrivalEffect(position, success, networkType) {
        const networkConfig = CONFIG.NETWORK.TYPES[networkType];
        
        // Create burst effect
        const burstGeometry = new THREE.RingGeometry(0.5, 2, 16);
        const burstMaterial = new THREE.MeshBasicMaterial({
            color: success ? networkConfig.color : 0xff0000,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const burst = new THREE.Mesh(burstGeometry, burstMaterial);
        burst.position.copy(position);
        burst.position.y += 20; // At base station antenna level
        burst.rotation.x = -Math.PI / 2;
        
        this.scene.add(burst);
        
        // Animate burst
        const startTime = Date.now();
        const duration = 500;
        
        const animateBurst = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                burst.scale.setScalar(1 + progress * 2);
                burst.material.opacity = 0.6 * (1 - progress);
                requestAnimationFrame(animateBurst);
            } else {
                this.scene.remove(burst);
                burst.geometry.dispose();
                burst.material.dispose();
            }
        };
        
        animateBurst();
    }

    updateCommunicationLines() {
        // Update existing communication lines with message type colors
        this.communicationLines.forEach((line, vehicleId) => {
            const vehicle = this.vehicleManager.vehicles.find(v => v.userData.id === vehicleId);
            if (vehicle && vehicle.userData.currentMessageType) {
                const messageConfig = CONFIG.MESSAGE_TYPES[vehicle.userData.currentMessageType];
                const networkConfig = CONFIG.NETWORK.TYPES[vehicle.userData.currentNetwork];
                
                // Blend message color with network color
                const messageColor = new THREE.Color(messageConfig.color);
                const networkColor = new THREE.Color(networkConfig.color);
                const blendedColor = messageColor.lerp(networkColor, 0.5);
                
                line.material.color = blendedColor;
                
                // Update line opacity based on message priority
                const priority = messageConfig.priority || 4;
                line.material.opacity = 0.3 + (5 - priority) * 0.2; // Higher priority = more opaque
            }
        });
    }

    calculateLatency(distance, networkType, messageType = 'BASIC_CAM_MESSAGE', commType) {
        const networkParams = CONFIG.NETWORK.TYPES[networkType];
        const messageConfig = CONFIG.MESSAGE_TYPES[messageType];
        
        // Base latency from network
        let latency = networkParams.latencyMs;
        
        // Add distance-based latency (simplified)
        latency += distance * 0.1;
        
        // Add processing latency based on message size
        const processingLatency = messageConfig.size / 1000; // 1ms per KB
        latency += processingLatency;
        
        // Add some random variation
        latency += (Math.random() - 0.5) * 10;
        
        // Add additional latency based on communication type
        if (commType === 'rsu') {
            latency += 50; // 50ms additional latency for RSU communication
        }
        
        return Math.max(1, latency); // Minimum 1ms latency
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

    // Interactive control methods
    setSignalStrength(strengthMultiplier) {
        this.signalStrengthMultiplier = Math.max(0.1, Math.min(2.0, strengthMultiplier));
        console.log(`Signal strength multiplier set to ${this.signalStrengthMultiplier}`);
    }

    getSignalStrength() {
        return this.signalStrengthMultiplier;
    }

    getNetworkEfficiency() {
        if (this.stats.packetsSent === 0) return 0;
        return ((this.stats.packetsReceived / this.stats.packetsSent) * 100).toFixed(1);
    }

    submitProcessingTask(vehicle, messageType, commPath, selectedNetwork) {
        // Determine task type based on message type
        let taskType = 'BASIC_PROCESSING';
        
        switch (messageType) {
            case 'BASIC_CAM_MESSAGE':
                taskType = 'LOCAL_TRAFFIC';
                break;
            case 'EMERGENCY_MESSAGE':
                taskType = 'SAFETY_ALERTS';
                break;
            case 'TRAFFIC_LIGHT_MESSAGE':
                taskType = 'TRAFFIC_ANALYSIS';
                break;
            case 'WEATHER_MESSAGE':
                taskType = 'BASIC_PROCESSING';
                break;
            case 'COLLISION_WARNING':
                taskType = 'SAFETY_PROCESSING';
                break;
            default:
                taskType = 'BASIC_PROCESSING';
        }
        
        // Create processing task
        const task = {
            id: `${vehicle.userData.id}_${messageType}_${Date.now()}`,
            type: taskType,
            vehicleId: vehicle.userData.id,
            messageType: messageType,
            networkType: selectedNetwork,
            location: vehicle.position.clone(),
            priority: this.getTaskPriority(messageType),
            data: {
                vehicleSpeed: vehicle.userData.speed || 0,
                position: vehicle.position.clone(),
                timestamp: performance.now(),
                commPath: commPath.type
            },
            onComplete: (task, processorId, processingTime) => {
                console.log(`Task ${task.id} processed by ${processorId} in ${processingTime.toFixed(2)}ms`);
                
                // Update AI with processing feedback
                if (this.ai) {
                    const reward = this.calculateProcessingReward(processingTime, task.priority);
                    this.ai.updateProcessingReward(task.vehicleId, reward);
                }
            }
        };
        
        // Submit task to processing manager
        const submitted = this.processingManager.submitTask(task);
        
        if (!submitted) {
            console.warn(`Failed to submit processing task for vehicle ${vehicle.userData.id}`);
        }
    }
    
    getTaskPriority(messageType) {
        switch (messageType) {
            case 'EMERGENCY_MESSAGE':
                return 10; // Highest priority
            case 'COLLISION_WARNING':
                return 9;
            case 'TRAFFIC_LIGHT_MESSAGE':
                return 5;
            case 'BASIC_CAM_MESSAGE':
                return 3;
            case 'WEATHER_MESSAGE':
                return 1; // Lowest priority
            default:
                return 2;
        }
    }
    
    calculateProcessingReward(processingTime, priority) {
        // Higher reward for faster processing of high-priority tasks
        const baseReward = 1.0;
        const timeBonus = Math.max(0, 1.0 - (processingTime / 1000)); // Bonus for processing under 1 second
        const priorityBonus = priority / 10; // Priority-based bonus
        return baseReward + timeBonus + priorityBonus;
    }
} 