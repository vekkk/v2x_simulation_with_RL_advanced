import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { CONFIG } from '../config/config.js';
import { BaseStationAI } from '../ai/BaseStationAI.js';

export class EnhancedVisualNetworkManager {
    constructor(scene, vehicleManager) {
        console.log('🚀 EnhancedVisualNetworkManager v2.0 loaded - using getAvailableActions method');
        
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
        
        // Identify vehicles that can send safety messages
        setTimeout(() => {
            this.identifySafetyMessageVehicles();
            
            // Test safety message after 3 seconds
            setTimeout(() => {
                console.log('🧪 Testing safety message creation...');
                if (this.vehicleManager.vehicles.length > 0) {
                    const testVehicle = this.vehicleManager.vehicles[0];
                    console.log(`🧪 Testing with Vehicle ${testVehicle.userData.id}`);
                    this.forceSafetyMessage(testVehicle.userData.id);
                }
            }, 3000);
            
            // Test visualization directly after 5 seconds
            setTimeout(() => {
                console.log('🧪🧪🧪 TESTING VISUALIZATION DIRECTLY 🧪🧪🧪');
                this.testSafetyMessageVisualization();
            }, 5000);
            
            // IMMEDIATE TEST: Create safety message without network selection
            setTimeout(() => {
                console.log('🚨🚨🚨 IMMEDIATE SAFETY MESSAGE TEST 🚨🚨🚨');
                if (this.vehicleManager.vehicles.length > 0) {
                    const testVehicle = this.vehicleManager.vehicles[0];
                    console.log(`🚨 Creating immediate safety message for Vehicle ${testVehicle.userData.id}`);
                    
                    // Create dramatic safety message directly without network selection
                    const safetyMessage = this.createDramaticSafetyMessage(testVehicle, this.rsuPosition);
                    
                    // Add to active messages
                    const messageId = `IMMEDIATE_TEST_${testVehicle.userData.id}_${Date.now()}`;
                    this.activeMessages.set(messageId, safetyMessage);
                    
                    console.log(`🚨🚨🚨 IMMEDIATE SAFETY MESSAGE CREATED 🚨🚨🚨`);
                    console.log(`🚨 Active messages: ${this.activeMessages.size}`);
                    console.log(`🚨 Scene children: ${this.scene.children.length}`);
                }
            }, 1000); // Only 1 second delay
        }, 2000); // Wait 2 seconds for vehicles to be created
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

    // NEW: Identify vehicles that will send safety messages
    identifySafetyMessageVehicles() {
        const safetyVehicles = [];
        this.vehicleManager.vehicles.forEach(vehicle => {
            // Make vehicles with even IDs more likely to send safety messages
            if (vehicle.userData.id % 2 === 0) {
                safetyVehicles.push(vehicle.userData.id);
            }
        });
        
        console.log(`🚨 Vehicles that can send safety messages: ${safetyVehicles.join(', ')}`);
        return safetyVehicles;
    }

    determineMessageType(vehicle) {
        // Simulate different message types based on vehicle behavior
        const rand = Math.random();
        
        // Check for emergency alert first
        if (vehicle.userData.emergencyAlert) {
            return 'SAFETY_MESSAGE';
        }
        
        // Make safety messages more predictable - vehicles with even IDs have higher chance
        let safetyChance = 0.05; // 5% base chance
        if (vehicle.userData.id % 2 === 0) {
            safetyChance = 0.25; // 25% chance for even ID vehicles
        }
        
        // Simulate occasional safety messages for visualization
        if (rand < safetyChance) {
            // Simulate emergency situation
            vehicle.userData.emergencyAlert = {
                type: 'COLLISION_WARNING',
                timestamp: Date.now(),
                priority: 'HIGH'
            };
            console.log(`🚨 Vehicle ${vehicle.userData.id} will send SAFETY MESSAGE!`);
            return 'SAFETY_MESSAGE';
        } else if (rand < 0.6) {
            return 'BASIC_CAM_MESSAGE';
        } else if (rand < 0.8) {
            return 'TRAFFIC_MESSAGE';
        } else {
            return 'INFOTAINMENT_MESSAGE';
        }
    }

    // NEW: Create dramatic safety message visualization
    createDramaticSafetyMessage(vehicle, target) {
        console.log(`🚨🚨🚨 DRAMATIC SAFETY MESSAGE from Vehicle ${vehicle.userData.id} 🚨🚨🚨`);
        
        // Create a large, dramatic safety message entity
        const safetyMessageGroup = new THREE.Group();
        
        // Main safety message body (large red sphere)
        const mainBodyGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const mainBodyMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.9
        });
        const mainBody = new THREE.Mesh(mainBodyGeometry, mainBodyMaterial);
        safetyMessageGroup.add(mainBody);
        
        // Warning rings around the main body
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.RingGeometry(2 + i * 0.5, 2.2 + i * 0.5, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.7 - i * 0.2,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            safetyMessageGroup.add(ring);
        }
        
        // Emergency warning text (3D text effect)
        const warningGeometry = new THREE.BoxGeometry(3, 0.5, 0.1);
        const warningMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const warningBox = new THREE.Mesh(warningGeometry, warningMaterial);
        warningBox.position.y = 2.5;
        safetyMessageGroup.add(warningBox);
        
        // Position the safety message above the vehicle
        safetyMessageGroup.position.copy(vehicle.position);
        safetyMessageGroup.position.y += 3; // High above vehicle
        
        // Add dramatic lighting effect
        const pointLight = new THREE.PointLight(0xff0000, 2, 10);
        pointLight.position.set(0, 0, 0);
        safetyMessageGroup.add(pointLight);
        
        // Store animation data
        safetyMessageGroup.userData = {
            type: 'SAFETY_MESSAGE',
            startPosition: vehicle.position.clone(),
            targetPosition: target.clone(),
            startTime: performance.now(),
            duration: 3000 * this.slowMotionFactor, // 3 seconds
            vehicleId: vehicle.userData.id,
            isDramatic: true,
            warningRings: safetyMessageGroup.children.filter(child => child.geometry instanceof THREE.RingGeometry),
            mainBody: mainBody,
            warningBox: warningBox,
            pointLight: pointLight
        };
        
        this.scene.add(safetyMessageGroup);
        return safetyMessageGroup;
    }

    // NEW: Update dramatic safety messages
    updateDramaticSafetyMessages(deltaTime) {
        const currentTime = performance.now();
        
        // Find all dramatic safety messages in the scene
        this.scene.children.forEach(child => {
            if (child.userData && child.userData.type === 'SAFETY_MESSAGE' && child.userData.isDramatic) {
                const elapsed = currentTime - child.userData.startTime;
                const progress = elapsed / child.userData.duration;
                
                if (progress >= 1) {
                    // Remove the dramatic safety message
                    this.scene.remove(child);
                    console.log(`🚨 Safety message from Vehicle ${child.userData.vehicleId} reached destination`);
                } else {
                    // Update position
                    const startPos = child.userData.startPosition;
                    const targetPos = child.userData.targetPosition;
                    child.position.lerpVectors(startPos, targetPos, progress);
                    child.position.y = startPos.y + 3 + Math.sin(progress * Math.PI * 8) * 0.5; // Floating motion
                    
                    // Dramatic rotation
                    child.rotation.y += 0.2;
                    child.rotation.z += 0.1;
                    
                    // Pulse the main body
                    const scale = 1 + Math.sin(progress * Math.PI * 12) * 0.3;
                    child.userData.mainBody.scale.setScalar(scale);
                    
                    // Rotate warning rings
                    child.userData.warningRings.forEach((ring, index) => {
                        ring.rotation.z += 0.1 + index * 0.05;
                        ring.material.opacity = (0.7 - index * 0.2) * (0.8 + Math.sin(progress * Math.PI * 6) * 0.2);
                    });
                    
                    // Flash the warning box
                    child.userData.warningBox.material.opacity = 0.9 + Math.sin(progress * Math.PI * 10) * 0.3;
                    
                    // Pulse the light
                    child.userData.pointLight.intensity = 2 + Math.sin(progress * Math.PI * 8) * 1;
                }
            }
        });
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
        // Make safety messages larger and more prominent
        const particleSize = messageType === 'SAFETY_MESSAGE' ? 0.6 : 0.3;
        const particleGeometry = new THREE.SphereGeometry(particleSize, 12, 12);
        
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: this.messageColors[messageType],
            transparent: true,
            opacity: messageType === 'SAFETY_MESSAGE' ? 1.0 : 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(vehicle.position);
        
        // Add extra height for safety messages to make them more visible
        if (messageType === 'SAFETY_MESSAGE') {
            particle.position.y += 1.0; // Higher above vehicle
        }
        
        particle.userData = {
            messageType: messageType,
            startPosition: vehicle.position.clone(),
            targetPosition: target.clone(),
            startTime: performance.now(),
            duration: messageType === 'SAFETY_MESSAGE' ? 2000 * this.slowMotionFactor : 3000 * this.slowMotionFactor, // Faster for safety messages
            vehicleId: vehicle.userData.id,
            isSafetyMessage: messageType === 'SAFETY_MESSAGE'
        };
        
        this.scene.add(particle);
        return particle;
    }

    updateMessageParticles(deltaTime) {
        const currentTime = performance.now();
        
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
                
                // Enhanced effects for safety messages
                if (particle.userData.isSafetyMessage) {
                    // More dramatic pulsing for safety messages
                    particle.material.opacity = 0.9 + Math.sin(progress * Math.PI * 12) * 0.3;
                    particle.scale.setScalar(1 + Math.sin(progress * Math.PI * 8) * 0.2);
                    
                    // Add rotation for extra visual impact
                    particle.rotation.y += 0.1;
                    particle.rotation.z += 0.05;
                    
                    // Add color pulsing (red to bright red)
                    const baseColor = new THREE.Color(0xff0000);
                    const pulseColor = new THREE.Color(0xff4444);
                    const colorMix = Math.sin(progress * Math.PI * 6) * 0.5 + 0.5;
                    particle.material.color.lerpColors(baseColor, pulseColor, colorMix);
                } else {
                    // Standard effects for other message types
                    particle.material.opacity = 0.8 + Math.sin(progress * Math.PI * 4) * 0.1;
                    particle.scale.setScalar(1 + Math.sin(progress * Math.PI * 2) * 0.05);
                }
            }
        }
    }

    selectBestNetwork(vehicle) {
        console.log(`🔍 Selecting network for Vehicle ${vehicle.userData.id}...`);
        
        // Debug: Check if the correct method exists
        if (!this.ai.getAvailableActions) {
            console.error('❌ ERROR: getAvailableActions method not found in BaseStationAI!');
            console.error('❌ Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.ai)));
            return 'None';
        }
        
        const availableNetworks = this.ai.getAvailableActions(vehicle);
        console.log(`📡 Available networks for Vehicle ${vehicle.userData.id}:`, availableNetworks);
        
        if (availableNetworks.length === 0 || availableNetworks[0] === 'NONE') {
            console.log(`❌ No networks available for Vehicle ${vehicle.userData.id}`);
            return 'None';
        }
        
        // Simulate cloud AI decision
        const cloudConfidence = Math.random();
        let selectedNetwork;
        
        if (cloudConfidence > 0.7) {
            // Cloud AI decision
            selectedNetwork = availableNetworks[Math.floor(Math.random() * availableNetworks.length)];
            this.stats.cloudDecisions++;
            console.log(`☁️ Cloud AI selected ${selectedNetwork} for Vehicle ${vehicle.userData.id} (confidence: ${cloudConfidence.toFixed(2)})`);
        } else {
            // Local AI decision
            selectedNetwork = this.ai.update(vehicle);
            console.log(`🤖 Local AI selected ${selectedNetwork} for Vehicle ${vehicle.userData.id}`);
        }
        
        vehicle.userData.currentNetwork = selectedNetwork;
        console.log(`✅ Network ${selectedNetwork} assigned to Vehicle ${vehicle.userData.id}`);
        return selectedNetwork;
    }

    transmitMessage(vehicle, currentTime) {
        const selectedNetwork = vehicle.userData.currentNetwork;
        if (!selectedNetwork || selectedNetwork === 'None') return;

        // Determine message type
        const messageType = this.determineMessageType(vehicle);
        const messageData = this.generateMessageData(vehicle, messageType);
        
        console.log(`📤 Vehicle ${vehicle.userData.id} sending ${messageType} via ${selectedNetwork}`);
        
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
        let particle;
        
        if (messageType === 'SAFETY_MESSAGE') {
            // Use dramatic safety message visualization
            particle = this.createDramaticSafetyMessage(vehicle, target);
            console.log(`🚨🚨🚨 CREATED DRAMATIC SAFETY MESSAGE for Vehicle ${vehicle.userData.id} 🚨🚨🚨`);
        } else {
            // Use regular particle for other message types
            particle = this.createMessageParticle(vehicle, messageType, target);
        }
        
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
            startTime: performance.now(),
            duration: 2000 * this.slowMotionFactor,
            networkType: networkType
        };
        
        return line;
    }

    update(deltaTime, currentTime) {
        // Debug: Check if update is being called
        if (!this.updateCallCount) this.updateCallCount = 0;
        this.updateCallCount++;
        
        if (this.updateCallCount % 60 === 0) { // Log every 60 frames (~1 second)
            console.log(`🔄 EnhancedVisualNetworkManager.update() called ${this.updateCallCount} times`);
            console.log(`📊 Active messages: ${this.activeMessages.size}`);
            console.log(`🚗 Vehicles: ${this.vehicleManager.vehicles.length}`);
        }
        
        // Slow down the simulation
        const slowDeltaTime = deltaTime * this.slowMotionFactor;
        
        // Update message particles
        this.updateMessageParticles(slowDeltaTime);
        
        // Update dramatic safety messages
        this.updateDramaticSafetyMessages(slowDeltaTime);
        
        // Update communication lines
        this.updateCommunicationLines(slowDeltaTime);
        
        // Update range indicators
        this.updateRangeIndicators(slowDeltaTime);
        
        // Process vehicle messages (slower frequency)
        let processedVehicles = 0;
        this.vehicleManager.vehicles.forEach(vehicle => {
            const lastPacketTime = vehicle.userData.lastPacketTime || 0;
            const sendInterval = 1000 * this.slowMotionFactor; // 1 second in slow motion (faster for more visibility)
            
            if (currentTime - lastPacketTime >= sendInterval) {
                processedVehicles++;
                console.log(`🔄 Processing Vehicle ${vehicle.userData.id} for message transmission...`);
                
                // Select network
                const selectedNetwork = this.selectBestNetwork(vehicle);
                
                if (selectedNetwork && selectedNetwork !== 'None') {
                    // Transmit message
                    this.transmitMessage(vehicle, currentTime);
                    vehicle.userData.lastPacketTime = currentTime;
                } else {
                    console.log(`❌ No network selected for Vehicle ${vehicle.userData.id}`);
                }
            }
        });
        
        if (processedVehicles > 0) {
            console.log(`📊 Processed ${processedVehicles} vehicles for message transmission`);
        }
    }

    updateCommunicationLines(deltaTime) {
        const currentTime = performance.now();
        
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

    // Add missing methods that SimulationManager expects
    setPlotManager(plotManager) {
        this.plotManager = plotManager;
        console.log('📊 PlotManager set in EnhancedVisualNetworkManager');
    }

    setProcessingManager(processingManager) {
        this.processingManager = processingManager;
        console.log('⚙️ ProcessingManager set in EnhancedVisualNetworkManager');
    }

    setRSUPositions(rsuPositions) {
        this.rsuPositions = rsuPositions;
        console.log('📡 RSU positions set in EnhancedVisualNetworkManager');
    }

    updateBaseStationPosition(sceneManager) {
        if (sceneManager && sceneManager.baseStationPosition) {
            this.baseStationPosition.copy(sceneManager.baseStationPosition);
            console.log('🏢 Base station position updated in EnhancedVisualNetworkManager');
        }
    }

    // Add method to get network statistics in the format expected by SimulationManager
    getNetworkStats() {
        return {
            cellular: { active: this.stats.networkStats.LTE.sent > 0, messages: this.stats.networkStats.LTE.sent },
            wifi: { active: this.stats.networkStats.WIFI.sent > 0, messages: this.stats.networkStats.WIFI.sent },
            dsrc: { active: this.stats.networkStats.DSRC.sent > 0, messages: this.stats.networkStats.DSRC.sent },
            satellite: { active: false, messages: 0 }
        };
    }

    // Add method to clear messages
    clearMessages() {
        this.clearAllMessageParticles();
        this.clearAllCommunicationLines();
        console.log('🧹 All messages cleared in EnhancedVisualNetworkManager');
    }

    // NEW: Force a safety message from a specific vehicle (for testing)
    forceSafetyMessage(vehicleId) {
        const vehicle = this.vehicleManager.vehicles.find(v => v.userData.id === vehicleId);
        if (vehicle) {
            console.log(`🚨🚨🚨 FORCING SAFETY MESSAGE from Vehicle ${vehicleId} 🚨🚨🚨`);
            vehicle.userData.emergencyAlert = {
                type: 'FORCED_EMERGENCY',
                timestamp: Date.now(),
                priority: 'CRITICAL'
            };
            
            // Immediately transmit the safety message
            const selectedNetwork = this.selectBestNetwork(vehicle);
            if (selectedNetwork && selectedNetwork !== 'None') {
                this.transmitMessage(vehicle, performance.now());
            }
        } else {
            console.log(`❌ Vehicle ${vehicleId} not found`);
        }
    }

    // Add method to set slow motion factor
    setSlowMotion(factor) {
        this.slowMotionFactor = factor;
        console.log(`⏱️ Slow motion factor set to ${factor} in EnhancedVisualNetworkManager`);
    }

    // NEW: Simple test method to force safety message visualization
    testSafetyMessageVisualization() {
        console.log('🧪🧪🧪 TESTING SAFETY MESSAGE VISUALIZATION 🧪🧪🧪');
        
        if (this.vehicleManager.vehicles.length === 0) {
            console.log('❌ No vehicles available for testing');
            return;
        }
        
        const testVehicle = this.vehicleManager.vehicles[0];
        console.log(`🧪 Using Vehicle ${testVehicle.userData.id} at position:`, testVehicle.position);
        
        // Force network assignment
        testVehicle.userData.currentNetwork = 'DSRC';
        
        // Create a test target (RSU position)
        const testTarget = this.rsuPosition.clone();
        console.log(`🧪 Target position:`, testTarget);
        
        // Create dramatic safety message directly
        const safetyMessage = this.createDramaticSafetyMessage(testVehicle, testTarget);
        console.log(`🧪 Created safety message:`, safetyMessage);
        
        // Add to active messages
        const messageId = `TEST_MSG_${testVehicle.userData.id}_${Date.now()}`;
        this.activeMessages.set(messageId, safetyMessage);
        
        console.log(`🧪🧪🧪 SAFETY MESSAGE TEST COMPLETE 🧪🧪🧪`);
        console.log(`🧪 Active messages: ${this.activeMessages.size}`);
        console.log(`🧪 Scene children: ${this.scene.children.length}`);
    }
    
    // NEW: Version check method
    getVersion() {
        return 'EnhancedVisualNetworkManager v2.0 - getAvailableActions method';
    }
} 