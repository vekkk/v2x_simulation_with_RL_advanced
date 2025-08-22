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
        this.baseStationPosition = new THREE.Vector3(0, 0, 0);
        
        // Initialize RSU positions array
        this.rsuPositions = [];
        
        // Initialize PlotManager for analytics
        this.plotManager = null;
        
        // SNR calculation parameters
        this.snrParams = {
            // Transmit power in dBm
            BASE_STATION_TX_POWER: 43, // 20W base station
            RSU_TX_POWER: 30,          // 1W RSU
            VEHICLE_TX_POWER: 23,      // 200mW vehicle
            
            // Noise floor in dBm
            NOISE_FLOOR: -95,
            
            // Path loss exponents for different environments
            PATH_LOSS_EXPONENT: {
                LOS: 2.0,      // Line of sight
                NLOS: 3.5      // Non-line of sight
            },
            
            // Frequency-dependent parameters (in MHz)
            FREQUENCY: {
                DSRC: 5900,    // 5.9 GHz
                WIFI: 2400,    // 2.4 GHz  
                LTE: 700       // 700 MHz
            },
            
            // Minimum SNR thresholds for reliable communication (in dB)
            MIN_SNR_THRESHOLD: {
                DSRC: 10,      // High reliability requirement
                WIFI: 15,      // Medium reliability requirement
                LTE: 5         // Lower requirement due to better error correction
            }
        };
        
        console.log('NetworkManager initialized with SNR-based intelligent network selection');
    }

    // Set PlotManager reference (called from SimulationManager)
    setPlotManager(plotManager) {
        this.plotManager = plotManager;
        console.log('PlotManager integrated with NetworkManager');
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

    // Enhanced SNR calculation based on distance and frequency
    calculateSNR(distance, txPower, frequency, isLOS = true) {
        // Free space path loss calculation: FSPL = 20*log10(d) + 20*log10(f) + 32.45
        const fspl = 20 * Math.log10(distance) + 20 * Math.log10(frequency) + 32.45;
        
        // Additional path loss based on environment
        const pathLossExponent = isLOS ? this.snrParams.PATH_LOSS_EXPONENT.LOS : this.snrParams.PATH_LOSS_EXPONENT.NLOS;
        const additionalPathLoss = 10 * pathLossExponent * Math.log10(distance / 1); // Reference distance 1m
        
        // Total path loss
        const totalPathLoss = fspl + (additionalPathLoss - fspl) * 0.3; // Blend FSPL with path loss model
        
        // Received signal strength
        const receivedPower = txPower - totalPathLoss;
        
        // SNR calculation
        const snr = receivedPower - this.snrParams.NOISE_FLOOR;
        
        return Math.max(0, snr); // Ensure non-negative SNR
    }

    // Calculate comprehensive communication options for a vehicle
    calculateAllCommunicationOptions(vehicle) {
        const vehiclePos = vehicle.position;
        const options = [];

        // 1. Base Station Communication (LTE)
        const baseDistance = vehiclePos.distanceTo(this.baseStationPosition);
        const baseSNR = this.calculateSNR(
            baseDistance, 
            this.snrParams.BASE_STATION_TX_POWER, 
            this.snrParams.FREQUENCY.LTE,
            true // Assume LOS for base station
        );
        const basePacketLoss = this.calculateSNRBasedPacketLoss(baseSNR, 'LTE');
        
        options.push({
            type: 'base_station',
            networkType: 'LTE',
            target: this.baseStationPosition,
            distance: baseDistance,
            snr: baseSNR,
            packetLossRate: basePacketLoss,
            score: this.calculateLinkScore(baseSNR, basePacketLoss, 'LTE')
        });

        // 2. RSU Communications (WiFi)
        this.rsuPositions.forEach((rsu, index) => {
            const rsuDistance = vehiclePos.distanceTo(rsu.position);
            const rsuSNR = this.calculateSNR(
                rsuDistance,
                this.snrParams.RSU_TX_POWER,
                this.snrParams.FREQUENCY.WIFI,
                true // Assume LOS for RSU
            );
            const rsuPacketLoss = this.calculateSNRBasedPacketLoss(rsuSNR, 'WIFI');
            
            options.push({
                type: 'rsu',
                networkType: 'WIFI',
                target: rsu.position,
                rsu: rsu,
                rsuIndex: index,
                distance: rsuDistance,
                snr: rsuSNR,
                packetLossRate: rsuPacketLoss,
                score: this.calculateLinkScore(rsuSNR, rsuPacketLoss, 'WIFI')
            });
        });

        // 3. Vehicle-to-Vehicle Communications (DSRC)
        const nearbyVehicles = this.findNearbyVehicles(vehicle, 100); // Within 100m
        nearbyVehicles.forEach(nearbyVehicle => {
            const v2vDistance = vehiclePos.distanceTo(nearbyVehicle.position);
            const v2vSNR = this.calculateSNR(
                v2vDistance,
                this.snrParams.VEHICLE_TX_POWER,
                this.snrParams.FREQUENCY.DSRC,
                true // Assume LOS for nearby vehicles
            );
            const v2vPacketLoss = this.calculateSNRBasedPacketLoss(v2vSNR, 'DSRC');
            
            options.push({
                type: 'vehicle',
                networkType: 'DSRC',
                target: nearbyVehicle.position,
                targetVehicle: nearbyVehicle,
                distance: v2vDistance,
                snr: v2vSNR,
                packetLossRate: v2vPacketLoss,
                score: this.calculateLinkScore(v2vSNR, v2vPacketLoss, 'DSRC')
            });
        });

        return options;
    }

    // Find nearby vehicles within specified range
    findNearbyVehicles(vehicle, maxDistance) {
        const nearbyVehicles = [];
        const vehiclePos = vehicle.position;
        
        this.vehicleManager.vehicles.forEach(otherVehicle => {
            if (otherVehicle === vehicle) return;
            
            const distance = vehiclePos.distanceTo(otherVehicle.position);
            if (distance <= maxDistance) {
                nearbyVehicles.push(otherVehicle);
            }
        });
        
        return nearbyVehicles.sort((a, b) => {
            const distA = vehiclePos.distanceTo(a.position);
            const distB = vehiclePos.distanceTo(b.position);
            return distA - distB;
        });
    }

    // Calculate packet loss based on SNR
    calculateSNRBasedPacketLoss(snr, networkType) {
        const minSNR = this.snrParams.MIN_SNR_THRESHOLD[networkType];
        const basePacketLoss = CONFIG.NETWORK.TYPES[networkType].packetLossRate;
        
        if (snr >= minSNR + 10) {
            // Excellent SNR - minimal packet loss
            return basePacketLoss * 0.1;
        } else if (snr >= minSNR + 5) {
            // Good SNR - low packet loss
            return basePacketLoss * 0.3;
        } else if (snr >= minSNR) {
            // Acceptable SNR - base packet loss
            return basePacketLoss;
        } else if (snr >= minSNR - 5) {
            // Poor SNR - increased packet loss
            return Math.min(0.5, basePacketLoss * 3);
        } else {
            // Very poor SNR - high packet loss
            return Math.min(0.8, basePacketLoss * 10);
        }
    }

    // Calculate link quality score (higher is better)
    calculateLinkScore(snr, packetLossRate, networkType) {
        const networkConfig = CONFIG.NETWORK.TYPES[networkType];
        
        // SNR component (0-100)
        const snrScore = Math.min(100, (snr / 30) * 100); // Normalize to 30dB max
        
        // Packet loss component (0-100, inverted)
        const packetLossScore = (1 - packetLossRate) * 100;
        
        // Latency component (0-100, inverted)
        const latencyScore = Math.max(0, 100 - networkConfig.latencyMs);
        
        // Bandwidth component (0-100)
        const bandwidthScore = Math.min(100, (networkConfig.bandwidth / 100) * 100);
        
        // Weighted combination
        const totalScore = (snrScore * 0.4) + (packetLossScore * 0.3) + (latencyScore * 0.2) + (bandwidthScore * 0.1);
        
        return totalScore;
    }

    // Select best communication option based on SNR and packet loss tradeoff
    selectBestCommunicationOption(vehicle, messageType) {
        const options = this.calculateAllCommunicationOptions(vehicle);
        const messageConfig = CONFIG.MESSAGE_TYPES[messageType];
        
        // Filter options that meet minimum requirements
        const viableOptions = options.filter(option => {
            const minSNR = this.snrParams.MIN_SNR_THRESHOLD[option.networkType];
            const maxPacketLoss = 1 - messageConfig.reliabilityRequirement;
            
            return option.snr >= minSNR - 3 && option.packetLossRate <= maxPacketLoss * 1.5;
        });
        
        if (viableOptions.length === 0) {
            console.warn(`No viable communication options for vehicle ${vehicle.userData.id}`);
            return options.length > 0 ? options[0] : null; // Fallback to best available
        }
        
        // Apply message-type specific preferences
        const scoredOptions = viableOptions.map(option => {
            let adjustedScore = option.score;
            
            // Prefer networks that match message type requirements
            const preferredNetworks = CONFIG.NETWORK.TYPES[option.networkType].preferredMessages || [];
            if (preferredNetworks.includes(messageType)) {
                adjustedScore *= 1.2; // 20% bonus for preferred network
            }
            
            // Safety messages prefer low-latency options
            if (messageType === 'SAFETY_MESSAGE') {
                if (option.networkType === 'DSRC') adjustedScore *= 1.3;
                if (option.type === 'vehicle') adjustedScore *= 1.1; // Prefer V2V for safety
            }
            
            // Infotainment prefers high-bandwidth options
            if (messageType === 'INFOTAINMENT_MESSAGE') {
                if (option.networkType === 'LTE') adjustedScore *= 1.2;
            }
            
            return { ...option, adjustedScore };
        });
        
        // Sort by adjusted score (highest first)
        scoredOptions.sort((a, b) => b.adjustedScore - a.adjustedScore);
        
        const bestOption = scoredOptions[0];
        
        // Store communication analytics in vehicle userData
        vehicle.userData.communicationAnalytics = {
            allOptions: options.length,
            viableOptions: viableOptions.length,
            selectedOption: bestOption,
            snrRange: {
                min: Math.min(...options.map(o => o.snr)),
                max: Math.max(...options.map(o => o.snr)),
                selected: bestOption.snr
            },
            packetLossRange: {
                min: Math.min(...options.map(o => o.packetLossRate)),
                max: Math.max(...options.map(o => o.packetLossRate)),
                selected: bestOption.packetLossRate
            }
        };
        
        return bestOption;
    }

    // Legacy method - now uses SNR-based calculation
    calculateSignalStrength(distance, networkType) {
        // Convert to SNR-based calculation
        const frequency = this.snrParams.FREQUENCY[networkType];
        let txPower;
        
        switch(networkType) {
            case 'LTE': txPower = this.snrParams.BASE_STATION_TX_POWER; break;
            case 'WIFI': txPower = this.snrParams.RSU_TX_POWER; break;
            case 'DSRC': txPower = this.snrParams.VEHICLE_TX_POWER; break;
            default: txPower = this.snrParams.RSU_TX_POWER;
        }
        
        const snr = this.calculateSNR(distance, txPower, frequency, true);
        return Math.min(1, snr / 30); // Normalize to 0-1 range
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

        return stats;
    }

    // Legacy method - now uses SNR-based packet loss
    calculateEffectivePacketLossRate(distance, networkParams) {
        // Use SNR-based calculation instead
        const networkType = Object.keys(CONFIG.NETWORK.TYPES).find(
            key => CONFIG.NETWORK.TYPES[key] === networkParams
        );
        
        if (!networkType) return networkParams.packetLossRate;
        
        const frequency = this.snrParams.FREQUENCY[networkType];
        let txPower;
        
        switch(networkType) {
            case 'LTE': txPower = this.snrParams.BASE_STATION_TX_POWER; break;
            case 'WIFI': txPower = this.snrParams.RSU_TX_POWER; break;
            case 'DSRC': txPower = this.snrParams.VEHICLE_TX_POWER; break;
            default: txPower = this.snrParams.RSU_TX_POWER;
        }
        
        const snr = this.calculateSNR(distance, txPower, frequency, true);
        return this.calculateSNRBasedPacketLoss(snr, networkType);
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

    // Enhanced communication path selection using SNR
    selectCommunicationPath(vehicle) {
        const messageType = vehicle.userData.currentMessageType || 'BASIC_CAM_MESSAGE';
        const bestOption = this.selectBestCommunicationOption(vehicle, messageType);
        
        if (!bestOption) {
            // Fallback to base station
            return {
                type: 'direct',
                networkType: 'LTE',
                target: this.baseStationPosition,
                distance: vehicle.position.distanceTo(this.baseStationPosition),
                snr: 0,
                packetLossRate: 0.5
            };
        }
        
        return {
            type: bestOption.type,
            networkType: bestOption.networkType,
            target: bestOption.target,
            distance: bestOption.distance,
            snr: bestOption.snr,
            packetLossRate: bestOption.packetLossRate,
            score: bestOption.score,
            rsu: bestOption.rsu,
            targetVehicle: bestOption.targetVehicle
        };
    }

    selectBestNetwork(vehicle) {
        const messageType = vehicle.userData.currentMessageType || 'BASIC_CAM_MESSAGE';
        const bestOption = this.selectBestCommunicationOption(vehicle, messageType);
        
        if (!bestOption) {
            console.log(`Vehicle ${vehicle.userData.id}: No network selected`);
            return 'None';
        }
        
        console.log(`Vehicle ${vehicle.userData.id}: Selected ${bestOption.networkType} (SNR: ${bestOption.snr.toFixed(1)}dB, Loss: ${(bestOption.packetLossRate*100).toFixed(1)}%)`);
        
        // Update vehicle's current network
        vehicle.userData.currentNetwork = bestOption.networkType;
        
        return bestOption.networkType;
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

        // Create new line to appropriate target based on communication path
        const commPath = this.selectCommunicationPath(vehicle);
        if (commPath && commPath.target) {
            const line = this.createCommunicationLine(vehicle, commPath);
            this.communicationLines.set(vehicle.id, line);
            this.scene.add(line);
        }
    }

    createCommunicationLine(vehicle, commPath) {
        const points = [
            vehicle.position.clone(),
            commPath.target.clone()
        ];
        
        // Adjust target height based on communication type
        if (commPath.type === 'base_station') {
            points[1].y += 20; // Base station antenna height
        } else if (commPath.type === 'rsu') {
            points[1].y += 4;  // RSU height
        } else if (commPath.type === 'vehicle') {
            points[1].y += 2;  // Vehicle antenna height
        }
        
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Color based on SNR quality
        let color;
        if (commPath.snr >= 20) {
            color = 0x00ff00; // Green - excellent
        } else if (commPath.snr >= 15) {
            color = 0x80ff00; // Yellow-green - good
        } else if (commPath.snr >= 10) {
            color = 0xffff00; // Yellow - acceptable
        } else if (commPath.snr >= 5) {
            color = 0xff8000; // Orange - poor
        } else {
            color = 0xff0000; // Red - very poor
        }
        
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: color,
            opacity: 0.6,
            transparent: true
        });
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
            // Select best network for vehicle using SNR-based selection
            const selectedNetwork = this.selectBestNetwork(vehicle);
            
            if (!selectedNetwork || selectedNetwork === 'None') {
                console.log(`Vehicle ${vehicle.userData.id}: No network selected`);
                return;
            }

            // Get message type and config
            const messageType = vehicle.userData.currentMessageType || 'BASIC_CAM_MESSAGE';
            const messageConfig = vehicle.userData.messageConfig || CONFIG.MESSAGE_TYPES.BASIC_CAM_MESSAGE;

            // Select best communication path using SNR analysis
            const commPath = this.selectCommunicationPath(vehicle);

            // Check if it's time to send a packet based on message frequency
            const lastPacketTime = vehicle.userData.lastPacketTime || 0;
            const sendInterval = messageConfig.frequency || 1000;
            
            if (currentTime - lastPacketTime >= sendInterval) {
                // Use SNR-based packet loss calculation
                const packetLossRate = commPath.packetLossRate || 0.1;
                const packetSuccess = Math.random() > packetLossRate;

                // Calculate latency with communication path consideration
                const latency = this.calculateLatency(commPath.distance, selectedNetwork, messageType, commPath.type);

                // Create packet visualization with SNR-based coloring
                this.createPacketVisualization(vehicle, messageType, selectedNetwork, packetSuccess, commPath);

                // Update statistics
                this.stats.packetsSent++;
                this.stats.networkStats[selectedNetwork].sent++;

                if (packetSuccess) {
                    this.stats.packetsReceived++;
                    this.stats.networkStats[selectedNetwork].received++;
                    this.stats.totalLatency += latency;
                    this.stats.totalDataTransferred += messageConfig.size;
                } else {
                    this.stats.packetsLost++;
                    this.stats.networkStats[selectedNetwork].lost++;
                }

                // Provide feedback to AI for reinforcement learning
                this.ai.updateReward(vehicle, selectedNetwork, packetSuccess, latency, commPath.distance);

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
                
                console.log(`Vehicle ${vehicle.userData.id}: ${messageType} via ${selectedNetwork} (${commPath.type}) - SNR: ${commPath.snr?.toFixed(1)}dB, Success: ${packetSuccess}, Distance: ${commPath.distance.toFixed(1)}m`);
            }
        });

        // Update communication line animations
        this.updateCommunicationLines();
    }

    createPacketVisualization(vehicle, messageType, networkType, success, commPath) {
        const messageConfig = CONFIG.MESSAGE_TYPES[messageType];
        
        // Create packet indicator above vehicle
        const packetGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        
        // Color based on success and SNR
        let color;
        if (success) {
            if (commPath.snr >= 20) {
                color = 0x00ff00; // Bright green - excellent SNR
            } else if (commPath.snr >= 15) {
                color = 0x80ff00; // Yellow-green - good SNR
            } else {
                color = messageConfig.color; // Message type color - acceptable SNR
            }
        } else {
            color = 0xff0000; // Red - failed transmission
        }
        
        const packetMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        const packet = new THREE.Mesh(packetGeometry, packetMaterial);
        packet.position.copy(vehicle.position);
        packet.position.y += 3; // Above vehicle
        
        // Add SNR and network type label
        this.addSNRLabel(packet, commPath.snr, networkType, commPath.type);
        
        // Animate packet towards target
        this.animatePacket(packet, vehicle.position.clone(), commPath.target.clone(), success, networkType, commPath);
        
        this.scene.add(packet);
    }

    addSNRLabel(packet, snr, networkType, commType) {
        // Create text sprite for SNR and network info
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 160;
        canvas.height = 48;
        
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.font = '10px Arial';
        context.textAlign = 'center';
        context.fillText(`${networkType} (${commType.toUpperCase()})`, canvas.width / 2, 16);
        context.fillText(`SNR: ${snr?.toFixed(1) || 'N/A'}dB`, canvas.width / 2, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(3, 1, 1);
        sprite.position.set(0, 1.5, 0);
        
        packet.add(sprite);
    }

    animatePacket(packet, startPos, endPos, success, networkType, commPath) {
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
                
                // Create arrival effect at target
                this.createArrivalEffect(endPos, success, networkType, commPath);
            }
        };
        
        animate();
    }

    createArrivalEffect(position, success, networkType, commPath) {
        const networkConfig = CONFIG.NETWORK.TYPES[networkType];
        
        // Create burst effect with SNR-based intensity
        const burstGeometry = new THREE.RingGeometry(0.5, 2, 16);
        
        // Color and intensity based on SNR
        let color, intensity;
        if (success && commPath.snr >= 15) {
            color = 0x00ff00; // Green for good SNR
            intensity = 0.8;
        } else if (success) {
            color = networkConfig.color; // Network color for acceptable SNR
            intensity = 0.6;
        } else {
            color = 0xff0000; // Red for failed
            intensity = 0.4;
        }
        
        const burstMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: intensity,
            side: THREE.DoubleSide
        });
        
        const burst = new THREE.Mesh(burstGeometry, burstMaterial);
        burst.position.copy(position);
        
        // Adjust height based on target type
        if (commPath.type === 'base_station') {
            burst.position.y += 20;
        } else if (commPath.type === 'rsu') {
            burst.position.y += 4;
        } else {
            burst.position.y += 2;
        }
        
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
                burst.material.opacity = intensity * (1 - progress);
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
        // Update existing communication lines with SNR-based colors
        this.communicationLines.forEach((line, vehicleId) => {
            const vehicle = this.vehicleManager.vehicles.find(v => v.userData.id === vehicleId);
            if (vehicle) {
                const commPath = this.selectCommunicationPath(vehicle);
                
                // Update line color based on SNR
                if (commPath.snr >= 20) {
                    line.material.color.setHex(0x00ff00); // Green - excellent
                } else if (commPath.snr >= 15) {
                    line.material.color.setHex(0x80ff00); // Yellow-green - good
                } else if (commPath.snr >= 10) {
                    line.material.color.setHex(0xffff00); // Yellow - acceptable
                } else if (commPath.snr >= 5) {
                    line.material.color.setHex(0xff8000); // Orange - poor
                } else {
                    line.material.color.setHex(0xff0000); // Red - very poor
                }
                
                // Update line opacity based on packet loss
                line.material.opacity = Math.max(0.2, 1 - commPath.packetLossRate);
            }
        });
    }

    calculateLatency(distance, networkType, messageType = 'BASIC_CAM_MESSAGE', commType) {
        const networkParams = CONFIG.NETWORK.TYPES[networkType];
        const messageConfig = CONFIG.MESSAGE_TYPES[messageType];
        
        // Base latency from network
        let latency = networkParams.latencyMs;
        
        // Add distance-based latency (speed of light delay)
        latency += distance * 0.0033; // ~3.3ns per meter
        
        // Add processing latency based on message size
        const processingLatency = messageConfig.size / 1000; // 1ms per KB
        latency += processingLatency;
        
        // Add communication type specific latency
        switch(commType) {
            case 'rsu':
                latency += 20; // RSU processing delay
                break;
            case 'vehicle':
                latency += 5;  // V2V has minimal additional delay
                break;
            case 'base_station':
                latency += 50; // Base station processing delay
                break;
        }
        
        // Add some random variation
        latency += (Math.random() - 0.5) * 10;
        
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
        this.scene.traverse(object => {
            if (object instanceof THREE.Line) {
                this.scene.remove(object);
                object.geometry.dispose();
                object.material.dispose();
            }
        });
    }
} 