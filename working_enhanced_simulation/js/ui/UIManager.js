import { CONFIG } from '../config/config.js';

export class UIManager {
    constructor() {
        console.log('UIManager: Initializing...');
        this.startButton = document.getElementById('start-btn');
        this.stopButton = document.getElementById('stop-btn');
        this.packetsSentElement = document.getElementById('packets-sent');
        this.packetsReceivedElement = document.getElementById('packets-received');
        this.packetsLostElement = document.getElementById('packets-lost');
        this.fpsElement = document.getElementById('fps');
        this.avgLatencyElement = document.getElementById('avg-latency');
        this.totalDataElement = document.getElementById('total-data');
        this.handoverCountElement = document.getElementById('handover-count') || document.getElementById('handovers');
        this.vehicleStatusContainer = document.getElementById('vehicle-status-container');
        this.aiEpsilonElement = document.getElementById('ai-epsilon');
        
        // Message type statistics elements - handle both analytics and advanced page formats
        this.messageTypeStatsElements = {
            SAFETY_MESSAGE: document.getElementById('safety-message-count') || document.querySelector('#safety-message-stats .count'),
            BASIC_CAM_MESSAGE: document.getElementById('basic-cam-message-count') || document.querySelector('#basic-cam-stats .count'),
            TRAFFIC_MESSAGE: document.getElementById('traffic-message-count') || document.querySelector('#traffic-message-stats .count'),
            INFOTAINMENT_MESSAGE: document.getElementById('infotainment-message-count') || document.querySelector('#infotainment-stats .count')
        };
        
        // RL learning statistics elements - handle both page formats
        this.rlStatsElements = {
            totalReward: document.getElementById('total-reward'),
            averageReward: document.getElementById('average-reward'),
            episodeCount: document.getElementById('episodes') || document.getElementById('episode-count'),
            explorationRate: document.getElementById('exploration-rate'),
            learningProgress: document.getElementById('learning-progress')
        };
        
        // Per-network stats elements
        this.networkStatsElements = {
            DSRC: {
                sent: document.querySelector('#dsrc-stats .sent'),
                received: document.querySelector('#dsrc-stats .received'),
                lost: document.querySelector('#dsrc-stats .lost')
            },
            WIFI: {
                sent: document.querySelector('#wifi-stats .sent'),
                received: document.querySelector('#wifi-stats .received'),
                lost: document.querySelector('#wifi-stats .lost')
            },
            LTE: {
                sent: document.querySelector('#lte-stats .sent'),
                received: document.querySelector('#lte-stats .received'),
                lost: document.querySelector('#lte-stats .lost')
            }
        };

        // Processing statistics elements
        this.processingStatsElements = {
            baseTasks: document.getElementById('base-tasks-processed'),
            baseLoad: document.getElementById('base-current-load'),
            baseLoadFill: document.getElementById('base-load-fill'),
            baseAvgTime: document.getElementById('base-avg-time'),
            baseEfficiency: document.getElementById('base-efficiency-value'),
            baseEfficiencyIndicator: document.getElementById('base-efficiency-indicator'),
            totalRSUs: document.getElementById('total-rsus'),
            rsuTasks: document.getElementById('rsu-tasks-processed'),
            rsuAvgLoad: document.getElementById('rsu-avg-load'),
            rsuEfficiency: document.getElementById('rsu-efficiency-value'),
            rsuEfficiencyIndicator: document.getElementById('rsu-efficiency-indicator'),
            baseTaskPercentage: document.getElementById('base-task-percentage'),
            rsuTaskPercentage: document.getElementById('rsu-task-percentage'),
            totalTasks: document.getElementById('total-tasks-processed')
        };

        this.setSimulationRunning(false);
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('UIManager: Setting up event listeners...');
        if (this.startButton) {
            console.log('UIManager: Adding click listener to start button');
            this.startButton.addEventListener('click', () => {
                console.log('UIManager: Start button clicked');
                if (this.startCallback) {
                    console.log('UIManager: Calling start callback');
                    try {
                        this.startCallback();
                    } catch (error) {
                        console.error('UIManager: Error in start callback:', error);
                    }
                } else {
                    console.warn('UIManager: No start callback set');
                }
            });
        } else {
            console.error('UIManager: Start button not found in DOM');
        }

        if (this.stopButton) {
            console.log('UIManager: Adding click listener to stop button');
            this.stopButton.addEventListener('click', () => {
                console.log('UIManager: Stop button clicked');
                if (this.stopCallback) {
                    console.log('UIManager: Calling stop callback');
                    try {
                        this.stopCallback();
                    } catch (error) {
                        console.error('UIManager: Error in stop callback:', error);
                    }
                } else {
                    console.warn('UIManager: No stop callback set');
                }
            });
        } else {
            console.error('UIManager: Stop button not found in DOM');
        }
    }

    setStartCallback(callback) {
        console.log('UIManager: Setting start callback');
        this.startCallback = callback;
    }

    setStopCallback(callback) {
        console.log('UIManager: Setting stop callback');
        this.stopCallback = callback;
    }

    setSimulationRunning(isRunning) {
        console.log('UIManager: Setting simulation running state:', isRunning);
        if (this.startButton) {
            this.startButton.disabled = isRunning;
            console.log('UIManager: Start button disabled:', isRunning);
        }
        if (this.stopButton) {
            this.stopButton.disabled = !isRunning;
            console.log('UIManager: Stop button disabled:', !isRunning);
        }
    }

    updateStats(stats) {
        console.log('UIManager: Received stats update:', stats);

        // Update overall packet statistics
        if (this.packetsSentElement) {
            this.packetsSentElement.textContent = stats.totalSent || 0;
            console.log('Updated packets sent:', stats.totalSent || 0);
        }
        if (this.packetsReceivedElement) {
            this.packetsReceivedElement.textContent = stats.totalReceived || 0;
            console.log('Updated packets received:', stats.totalReceived || 0);
        }
        if (this.packetsLostElement) {
            this.packetsLostElement.textContent = stats.totalLost || 0;
            console.log('Updated packets lost:', stats.totalLost || 0);
        }
        if (this.fpsElement) {
            this.fpsElement.textContent = Math.round(stats.fps || 0);
            console.log('Updated FPS:', Math.round(stats.fps || 0));
        }
        if (this.aiEpsilonElement) {
            this.aiEpsilonElement.textContent = (stats.aiEpsilon * 100).toFixed(1) + '%';
            console.log('Updated AI epsilon:', (stats.aiEpsilon * 100).toFixed(1) + '%');
        }

        // Update message type statistics
        if (stats.messageTypeStats) {
            console.log('Updating message type stats:', stats.messageTypeStats);
            for (const [messageType, count] of Object.entries(stats.messageTypeStats)) {
                const element = this.messageTypeStatsElements[messageType];
                if (element) {
                    element.textContent = count || 0;
                    console.log(`Updated ${messageType} count:`, count || 0);
                }
            }
        }

        // Update RL learning statistics
        if (stats.rlStats) {
            console.log('Updating RL stats:', stats.rlStats);
            if (this.rlStatsElements.totalReward) {
                this.rlStatsElements.totalReward.textContent = stats.rlStats.totalReward?.toFixed(2) || '0.00';
            }
            if (this.rlStatsElements.averageReward) {
                this.rlStatsElements.averageReward.textContent = stats.rlStats.averageReward?.toFixed(3) || '0.000';
            }
            if (this.rlStatsElements.episodeCount) {
                this.rlStatsElements.episodeCount.textContent = stats.rlStats.episodeCount || 0;
            }
            if (this.rlStatsElements.explorationRate) {
                this.rlStatsElements.explorationRate.textContent = (stats.rlStats.epsilon * 100).toFixed(1) + '%';
            }
            if (this.rlStatsElements.learningProgress) {
                const progress = Math.min(100, (stats.rlStats.episodeCount / 1000) * 100);
                this.rlStatsElements.learningProgress.style.width = progress + '%';
            }
        }

        // Update per-network statistics if available
        if (stats.networkStats) {
            console.log('Updating network stats:', stats.networkStats);
            for (const [networkType, networkStats] of Object.entries(stats.networkStats)) {
                const elements = this.networkStatsElements[networkType];
                if (elements) {
                    if (elements.sent) {
                        elements.sent.textContent = networkStats.sent || 0;
                        console.log(`Updated ${networkType} sent:`, networkStats.sent || 0);
                    }
                    if (elements.received) {
                        elements.received.textContent = networkStats.received || 0;
                        console.log(`Updated ${networkType} received:`, networkStats.received || 0);
                    }
                    if (elements.lost) {
                        elements.lost.textContent = networkStats.lost || 0;
                        console.log(`Updated ${networkType} lost:`, networkStats.lost || 0);
                    }
                }
            }
            
            // Log total network statistics for verification
            const totalNetworkSent = Object.values(stats.networkStats).reduce((sum, net) => sum + (net.sent || 0), 0);
            const totalNetworkReceived = Object.values(stats.networkStats).reduce((sum, net) => sum + (net.received || 0), 0);
            const totalNetworkLost = Object.values(stats.networkStats).reduce((sum, net) => sum + (net.lost || 0), 0);
            
            console.log(`📊 Network Totals: Sent=${totalNetworkSent}, Received=${totalNetworkReceived}, Lost=${totalNetworkLost}`);
            console.log(`📊 Main Stats: totalSent=${stats.totalSent}, totalReceived=${stats.totalReceived}, totalLost=${stats.totalLost}`);
            
            // Verify consistency
            if (totalNetworkSent !== stats.totalSent) {
                console.warn(`⚠️ Network sent mismatch: ${totalNetworkSent} vs ${stats.totalSent}`);
            }
            if (totalNetworkReceived !== stats.totalReceived) {
                console.warn(`⚠️ Network received mismatch: ${totalNetworkReceived} vs ${stats.totalReceived}`);
            }
            if (totalNetworkLost !== stats.totalLost) {
                console.warn(`⚠️ Network lost mismatch: ${totalNetworkLost} vs ${stats.totalLost}`);
            }
        }
        
        // Update additional network metrics that might be missing
        if (this.avgLatencyElement && stats.totalReceived > 0) {
            const avgLatency = stats.totalLatency / stats.totalReceived;
            this.avgLatencyElement.textContent = `${avgLatency.toFixed(1)} ms`;
        }
        
        if (this.totalDataElement) {
            const dataKB = (stats.totalDataTransferred / 1024).toFixed(2);
            this.totalDataElement.textContent = `${dataKB} KB`;
        }
        
        if (this.handoverCountElement) {
            // Simulate handover count based on network changes
            const handoverCount = Math.floor(stats.totalSent / 10); // Every 10 messages might trigger a handover
            this.handoverCountElement.textContent = handoverCount;
        }

        // Update processing statistics
        if (stats.processingStats) {
            console.log('Updating processing stats:', stats.processingStats);
            if (this.processingStatsElements.baseTasks) {
                this.processingStatsElements.baseTasks.textContent = stats.processingStats.baseStation.tasksProcessed || 0;
            }
            if (this.processingStatsElements.baseLoad) {
                const currentLoad = stats.processingStats.baseStation.currentLoad || 0;
                const maxLoad = stats.processingStats.baseStation.maxLoad || 50;
                this.processingStatsElements.baseLoad.textContent = `${currentLoad}/${maxLoad}`;
            }
            if (this.processingStatsElements.baseLoadFill) {
                const currentLoad = stats.processingStats.baseStation.currentLoad || 0;
                const maxLoad = stats.processingStats.baseStation.maxLoad || 50;
                const loadPercentage = (currentLoad / maxLoad) * 100;
                this.processingStatsElements.baseLoadFill.style.width = `${loadPercentage}%`;
                
                // Update load bar color based on load
                if (loadPercentage > 80) {
                    this.processingStatsElements.baseLoadFill.classList.add('high-load');
                } else {
                    this.processingStatsElements.baseLoadFill.classList.remove('high-load');
                }
            }
            if (this.processingStatsElements.baseAvgTime) {
                const avgTime = stats.processingStats.baseStation.averageProcessingTime || 0;
                this.processingStatsElements.baseAvgTime.textContent = `${avgTime.toFixed(1)}ms`;
            }
            if (this.processingStatsElements.baseEfficiency) {
                const efficiency = stats.processingStats.baseStation.efficiency || 100;
                this.processingStatsElements.baseEfficiency.textContent = `${efficiency.toFixed(1)}%`;
            }
            if (this.processingStatsElements.baseEfficiencyIndicator) {
                const efficiency = stats.processingStats.baseStation.efficiency || 100;
                this.processingStatsElements.baseEfficiencyIndicator.style.width = `${efficiency}%`;
                
                // Update efficiency indicator color
                if (efficiency > 80) {
                    this.processingStatsElements.baseEfficiencyIndicator.style.backgroundColor = '#4CAF50';
                } else if (efficiency > 60) {
                    this.processingStatsElements.baseEfficiencyIndicator.style.backgroundColor = '#FF9800';
                } else {
                    this.processingStatsElements.baseEfficiencyIndicator.style.backgroundColor = '#f44336';
                }
            }
            
            // RSU statistics
            if (this.processingStatsElements.totalRSUs) {
                this.processingStatsElements.totalRSUs.textContent = stats.processingStats.rsuCount || 0;
            }
            if (this.processingStatsElements.rsuTasks) {
                this.processingStatsElements.rsuTasks.textContent = stats.processingStats.rsuTotalTasks || 0;
            }
            if (this.processingStatsElements.rsuAvgLoad) {
                const avgLoad = stats.processingStats.rsuAverageLoad || 0;
                this.processingStatsElements.rsuAvgLoad.textContent = `${avgLoad.toFixed(1)}%`;
            }
            if (this.processingStatsElements.rsuEfficiency) {
                const efficiency = stats.processingStats.rsuEfficiency || 100;
                this.processingStatsElements.rsuEfficiency.textContent = `${efficiency.toFixed(1)}%`;
            }
            if (this.processingStatsElements.rsuEfficiencyIndicator) {
                const efficiency = stats.processingStats.rsuEfficiency || 100;
                this.processingStatsElements.rsuEfficiencyIndicator.style.width = `${efficiency}%`;
                
                // Update efficiency indicator color
                if (efficiency > 80) {
                    this.processingStatsElements.rsuEfficiencyIndicator.style.backgroundColor = '#4CAF50';
                } else if (efficiency > 60) {
                    this.processingStatsElements.rsuEfficiencyIndicator.style.backgroundColor = '#FF9800';
                } else {
                    this.processingStatsElements.rsuEfficiencyIndicator.style.backgroundColor = '#f44336';
                }
            }
            
            // Task distribution
            if (this.processingStatsElements.baseTaskPercentage) {
                const baseTasks = stats.processingStats.baseStation.tasksProcessed || 0;
                const rsuTasks = stats.processingStats.rsuTotalTasks || 0;
                const totalTasks = baseTasks + rsuTasks;
                const basePercentage = totalTasks > 0 ? (baseTasks / totalTasks) * 100 : 0;
                this.processingStatsElements.baseTaskPercentage.textContent = `${basePercentage.toFixed(1)}%`;
            }
            if (this.processingStatsElements.rsuTaskPercentage) {
                const baseTasks = stats.processingStats.baseStation.tasksProcessed || 0;
                const rsuTasks = stats.processingStats.rsuTotalTasks || 0;
                const totalTasks = baseTasks + rsuTasks;
                const rsuPercentage = totalTasks > 0 ? (rsuTasks / totalTasks) * 100 : 0;
                this.processingStatsElements.rsuTaskPercentage.textContent = `${rsuPercentage.toFixed(1)}%`;
            }
            if (this.processingStatsElements.totalTasks) {
                const baseTasks = stats.processingStats.baseStation.tasksProcessed || 0;
                const rsuTasks = stats.processingStats.rsuTotalTasks || 0;
                this.processingStatsElements.totalTasks.textContent = baseTasks + rsuTasks;
            }
        }
        
        // Update latency graph if latency data is available
        if (stats.latencyData && stats.latencyData.length > 0) {
            this.updateLatencyGraph(stats.latencyData);
        }

        // Update additional metrics
        if (this.avgLatencyElement) {
            this.avgLatencyElement.textContent = stats.averageLatency + ' ms';
            console.log('Updated average latency:', stats.averageLatency + ' ms');
        }
        if (this.totalDataElement) {
            this.totalDataElement.textContent = stats.totalDataKB + ' KB';
            console.log('Updated total data:', stats.totalDataKB + ' KB');
        }
        if (this.handoverCountElement) {
            this.handoverCountElement.textContent = stats.handoverCount;
            console.log('Updated handover count:', stats.handoverCount);
        }

        // Update network statistics
        if (stats.networkStats) {
            this.updateElement('total-packets', stats.networkStats.totalPacketsSent || 0);
            this.updateElement('packets-received', stats.networkStats.totalPacketsReceived || 0);
            this.updateElement('packets-lost', stats.networkStats.totalPacketsLost || 0);
            
            // Handle averageLatency which might already be a formatted string
            const latencyValue = stats.networkStats.averageLatency || 0;
            const formattedLatency = typeof latencyValue === 'string' 
                ? `${latencyValue} ms` 
                : `${Number(latencyValue).toFixed(2)} ms`;
            this.updateElement('avg-latency', formattedLatency);
        }

        // Update AI statistics
        if (stats.aiStats) {
            this.updateElement('ai-decisions', stats.aiStats.totalDecisions || 0);
            this.updateElement('ai-accuracy', `${((stats.aiStats.accuracy || 0) * 100).toFixed(1)}%`);
            this.updateElement('ai-learning-rate', stats.aiStats.learningRate || 0);
        }

        // Update traffic light statistics
        if (stats.trafficStats) {
            this.updateTrafficStats(stats.trafficStats);
        }
        
        // Update RSU agent statistics
        if (stats.rsuStats) {
            this.updateRSUAgentStats(stats.rsuStats);
        }
    }

    updateFPS(fps) {
        if (this.fpsElement) {
            this.fpsElement.textContent = Math.round(fps);
        }
    }

    updateVehicleStatus(vehicles) {
        if (!this.vehicleStatusContainer) return;

        // Clear existing status
        this.vehicleStatusContainer.innerHTML = '';

        // Create status for each vehicle
        vehicles.forEach((vehicle, index) => {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'vehicle-status';
            
            // Get vehicle color from configuration instead of material
            const vehicleType = vehicle.userData.type || 'CAR';
            const vehicleConfig = CONFIG.VEHICLES.TYPES[vehicleType];
            const vehicleColor = vehicleConfig ? vehicleConfig.MODEL.bodyColor : 0x0000ff;
            statusDiv.style.borderLeftColor = '#' + vehicleColor.toString(16).padStart(6, '0');

            // Get message type info
            const messageType = vehicle.userData.currentMessageType || 'BASIC_CAM_MESSAGE';
            const messageConfig = vehicle.userData.messageConfig || { id: 'M2', color: 0x00ff00 };
            const messageColor = '#' + messageConfig.color.toString(16).padStart(6, '0');
            
            // Get reward info
            const totalReward = vehicle.userData.totalReward || 0;
            const rewardColor = totalReward >= 0 ? '#4CAF50' : '#F44336';

            const vehicleInfo = `
                <div class="vehicle-info">
                    <span class="vehicle-type">${vehicle.userData.type}</span>
                    <span class="vehicle-speed">${vehicle.userData.speed.toFixed(1)} m/s</span>
                </div>
                <div class="network-info">
                    <span class="network-type">Network: ${vehicle.userData.currentNetwork || 'None'}</span>
                </div>
                <div class="message-info">
                    <span class="message-type" style="color: ${messageColor}; font-weight: bold;">
                        ${messageConfig.id} - ${messageType.replace('_', ' ')}
                    </span>
                </div>
                <div class="reward-info">
                    <span class="reward-value" style="color: ${rewardColor};">
                        Reward: ${totalReward.toFixed(2)}
                    </span>
                </div>
            `;

            statusDiv.innerHTML = vehicleInfo;
            this.vehicleStatusContainer.appendChild(statusDiv);
        });
    }

    resetVehicleStatus() {
        if (this.vehicleStatusContainer) {
            this.vehicleStatusContainer.innerHTML = '';
        }
    }

    resetNetworkStats() {
        // Don't reset stats when stopping, only when explicitly requested
        if (this.packetsSentElement) {
            this.packetsSentElement.textContent = '0';
        }
        if (this.packetsReceivedElement) {
            this.packetsReceivedElement.textContent = '0';
        }
        if (this.packetsLostElement) {
            this.packetsLostElement.textContent = '0';
        }
        if (this.avgLatencyElement) {
            this.avgLatencyElement.textContent = '0 ms';
        }
        if (this.totalDataElement) {
            this.totalDataElement.textContent = '0 KB';
        }
        if (this.handoverCountElement) {
            this.handoverCountElement.textContent = '0';
        }

        // Reset per-network statistics
        Object.values(this.networkStatsElements).forEach(elements => {
            if (elements.sent) elements.sent.textContent = '0';
            if (elements.received) elements.received.textContent = '0';
            if (elements.lost) elements.lost.textContent = '0';
        });
    }

    updateVehicleSummary(summary) {
        console.log('UIManager: Updating vehicle summary:', summary);
        
        // Update total vehicles count
        const totalVehiclesElement = document.getElementById('total-vehicles');
        if (totalVehiclesElement) {
            totalVehiclesElement.textContent = summary.totalVehicles || 0;
        }

        // Update vehicle type breakdown
        if (summary.byType) {
            for (const [type, count] of Object.entries(summary.byType)) {
                const element = document.getElementById(`${type.toLowerCase()}-count`);
                if (element) {
                    element.textContent = count;
                }
            }
        }

        // Update network distribution
        if (summary.byNetwork) {
            for (const [network, count] of Object.entries(summary.byNetwork)) {
                const element = document.getElementById(`${network.toLowerCase()}-vehicles`);
                if (element) {
                    element.textContent = count;
                }
            }
        }

        // Update message type distribution
        if (summary.byMessageType) {
            for (const [messageType, count] of Object.entries(summary.byMessageType)) {
                const element = document.getElementById(`${messageType.toLowerCase().replace('_', '-')}-vehicles`);
                if (element) {
                    element.textContent = count;
                }
            }
        }

        // Update RL statistics
        if (summary.averageReward !== undefined) {
            const avgRewardElement = document.getElementById('vehicle-average-reward');
            if (avgRewardElement) {
                avgRewardElement.textContent = summary.averageReward.toFixed(3);
            }
        }

        if (summary.totalMessageTypeChanges !== undefined) {
            const changesElement = document.getElementById('total-message-changes');
            if (changesElement) {
                changesElement.textContent = summary.totalMessageTypeChanges;
            }
        }
    }

    createMessageTypeLegend() {
        const legendContainer = document.getElementById('message-type-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = '';
        
        // Import CONFIG to get message type colors
        import('../config/config.js').then(({ CONFIG }) => {
            Object.entries(CONFIG.MESSAGE_TYPES).forEach(([type, config]) => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `
                    <div class="legend-color" style="background-color: #${config.color.toString(16).padStart(6, '0')}"></div>
                    <span class="legend-label">${config.id} - ${config.name}</span>
                `;
                legendContainer.appendChild(legendItem);
            });
        });
    }

    resetMessageTypeStats() {
        Object.values(this.messageTypeStatsElements).forEach(element => {
            if (element) element.textContent = '0';
        });
    }

    resetRLStats() {
        Object.values(this.rlStatsElements).forEach(element => {
            if (element) {
                if (element.style && element.style.width !== undefined) {
                    element.style.width = '0%';
                } else {
                    element.textContent = '0';
                }
            }
        });
    }

    updateTrafficStats(trafficStats) {
        this.updateElement('total-intersections', trafficStats.totalIntersections || 0);
        this.updateElement('active-intersections', trafficStats.activeIntersections || 0);
        this.updateElement('avg-wait-time', `${(trafficStats.averageWaitTime || 0).toFixed(2)} s`);
        this.updateElement('traffic-throughput', trafficStats.throughput || 0);
        this.updateElement('emergency-activations', trafficStats.emergencyActivations || 0);
        
        // Update efficiency indicator
        const trafficEfficiency = trafficStats.efficiency || 0;
        const trafficEfficiencyElement = document.getElementById('traffic-efficiency');
        if (trafficEfficiencyElement) {
            trafficEfficiencyElement.textContent = `${(trafficEfficiency * 100).toFixed(1)}%`;
            trafficEfficiencyElement.className = `efficiency-value ${trafficEfficiency > 0.8 ? 'high' : trafficEfficiency > 0.6 ? 'medium' : 'low'}`;
        }
        
        // Update coordination success rate
        const coordinationRate = trafficStats.coordinationSuccessRate || 0;
        this.updateElement('coordination-success', `${(coordinationRate * 100).toFixed(1)}%`);
    }

    updateRSUAgentStats(rsuStats) {
        this.updateElement('total-rsu-agents', rsuStats.totalAgents || 0);
        this.updateElement('rsu-avg-load', `${(rsuStats.averageLoad || 0).toFixed(1)}%`);
        this.updateElement('rsu-messages-processed', rsuStats.totalMessagesProcessed || 0);
        this.updateElement('rsu-avg-response-time', `${(rsuStats.averageResponseTime || 0).toFixed(2)} ms`);
        this.updateElement('cooperation-events', rsuStats.cooperationEvents || 0);
        
        // Update learning progress
        const learningProgress = rsuStats.learningProgress || 0;
        const learningElement = document.getElementById('rsu-learning-progress');
        if (learningElement) {
            learningElement.textContent = `${(learningProgress * 100).toFixed(1)}%`;
            learningElement.className = `learning-progress ${learningProgress > 0.8 ? 'advanced' : learningProgress > 0.5 ? 'intermediate' : 'beginner'}`;
        }
        
        // Update RSU load bar
        const rsuLoadBar = document.getElementById('rsu-load-bar');
        if (rsuLoadBar) {
            const loadPercentage = Math.min(rsuStats.averageLoad || 0, 100);
            rsuLoadBar.style.width = `${loadPercentage}%`;
            rsuLoadBar.className = `load-bar ${loadPercentage > 80 ? 'high-load' : loadPercentage > 60 ? 'medium-load' : 'low-load'}`;
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateLatencyGraph(latencyData) {
        if (!latencyData || latencyData.length === 0) return;
        
        const canvas = document.getElementById('latency-graph');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate scales with better handling of edge cases
        const maxLatency = Math.max(...latencyData.map(d => d.latency), 50); // Reduced minimum range from 100ms to 50ms
        const maxVehicles = Math.max(...latencyData.map(d => d.vehicleCount), 10); // Minimum 10 vehicles range
        const minLatency = Math.min(...latencyData.map(d => d.latency), 10); // Reduced minimum from 20ms to 10ms
        const minVehicles = Math.min(...latencyData.map(d => d.vehicleCount), 0);
        
        const latencyRange = maxLatency - minLatency;
        const vehicleRange = maxVehicles - minVehicles;
        
        const latencyScale = height / (latencyRange + 1);
        const vehicleScale = width / (vehicleRange + 1);
        
        // Draw grid with better visibility
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // Vertical grid lines (vehicle count) - every 2 vehicles
        for (let i = 0; i <= Math.ceil(maxVehicles / 2); i++) {
            const x = (width / Math.ceil(maxVehicles / 2)) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal grid lines (latency) - every 10ms instead of 20ms for better granularity
        for (let i = 0; i <= Math.ceil(maxLatency / 10); i++) {
            const y = (height / Math.ceil(maxLatency / 10)) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw latency line with better styling
        if (latencyData.length > 1) {
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            latencyData.forEach((point, index) => {
                const x = ((point.vehicleCount - minVehicles) * vehicleScale);
                const y = height - ((point.latency - minLatency) * latencyScale);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // Draw data points with better visibility
        ctx.fillStyle = '#ff6b6b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        latencyData.forEach(point => {
            const x = ((point.vehicleCount - minVehicles) * vehicleScale);
            const y = height - ((point.latency - minLatency) * latencyScale);
            
            // Use different colors for real vs simulated data
            if (point.isRealData) {
                ctx.fillStyle = '#4CAF50'; // Green for real data
                ctx.strokeStyle = '#ffffff';
            } else {
                ctx.fillStyle = '#ff6b6b'; // Red for simulated data
                ctx.strokeStyle = '#ffffff';
            }
            
            // Draw point with white border
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });
        
        // Add legend for data types
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        
        // Real data legend
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(10, height - 40, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Real Data', 25, height - 32);
        
        // Simulated data legend
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(10, height - 25, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Simulated Data', 25, height - 17);
        
        // Draw axis labels with better formatting
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        
        // X-axis labels (vehicle count) - every 2 vehicles
        for (let i = 0; i <= Math.ceil(maxVehicles / 2); i++) {
            const x = (width / Math.ceil(maxVehicles / 2)) * i;
            const vehicleCount = Math.round(minVehicles + (i / Math.ceil(maxVehicles / 2)) * vehicleRange);
            ctx.fillText(vehicleCount.toString(), x, height - 5);
        }
        
        // Y-axis labels (latency) - every 10ms instead of 20ms
        ctx.textAlign = 'right';
        for (let i = 0; i <= Math.ceil(maxLatency / 10); i++) {
            const y = (height / Math.ceil(maxLatency / 10)) * i;
            const latency = Math.round(maxLatency - (i / Math.ceil(maxLatency / 10)) * latencyRange);
            ctx.fillText(latency.toString(), 30, y + 4);
        }
        
        // Add title
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Latency vs Vehicle Count', width / 2, 20);
        
        // Update latency statistics
        this.updateLatencyStats(latencyData);
    }
    
    updateLatencyStats(latencyData) {
        if (!latencyData || latencyData.length === 0) return;
        
        const currentLatency = latencyData[latencyData.length - 1].latency;
        const avgLatency = latencyData.reduce((sum, d) => sum + d.latency, 0) / latencyData.length;
        const maxLatency = Math.max(...latencyData.map(d => d.latency));
        const minLatency = Math.min(...latencyData.map(d => d.latency));
        
        this.updateElement('current-latency', `${currentLatency.toFixed(1)} ms`);
        this.updateElement('average-latency-value', `${avgLatency.toFixed(1)} ms`);
        this.updateElement('max-latency', `${maxLatency.toFixed(1)} ms`);
        this.updateElement('min-latency', `${minLatency.toFixed(1)} ms`);
    }
} 