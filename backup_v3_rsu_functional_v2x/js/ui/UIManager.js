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
    }

    updateFPS(fps) {
        if (this.fpsElement) {
            this.fpsElement.textContent = Math.round(fps);
        }
    }

    updateVehicleStatus(vehicles) {
        if (!this.vehicleStatusContainer) {
            console.warn('UIManager: Vehicle status container not found');
            return;
        }

        // Clear existing status
        this.vehicleStatusContainer.innerHTML = '';

        // Create status for each vehicle
        vehicles.forEach((vehicle, index) => {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'vehicle-status';
            statusDiv.style.borderLeftColor = '#' + vehicle.material.color.getHexString();

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
} 