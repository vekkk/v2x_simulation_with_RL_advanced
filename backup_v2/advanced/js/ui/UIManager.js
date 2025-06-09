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

        // Create SNR Analytics Panel
        this.createSNRAnalyticsPanel();

        this.setSimulationRunning(false);
        this.setupEventListeners();
    }

    createSNRAnalyticsPanel() {
        // Check if SNR panel already exists
        if (document.getElementById('snr-analytics-panel')) {
            return;
        }

        // Create SNR Analytics Panel
        const snrPanel = document.createElement('div');
        snrPanel.id = 'snr-analytics-panel';
        snrPanel.className = 'snr-analytics-panel simulation-dashboard';
        snrPanel.innerHTML = `
            <h3>📡 SNR & Communication Analytics</h3>
            <div class="snr-summary">
                <h4>Network Performance</h4>
                <div class="network-performance">
                    <div class="network-item">
                        <span class="network-label">🔗 LTE (Base Station):</span>
                        <span class="network-value" id="lte-avg-snr">0.0 dB</span>
                    </div>
                    <div class="network-item">
                        <span class="network-label">📶 WiFi (RSU):</span>
                        <span class="network-value" id="wifi-avg-snr">0.0 dB</span>
                    </div>
                    <div class="network-item">
                        <span class="network-label">🚗 DSRC (V2V):</span>
                        <span class="network-value" id="dsrc-avg-snr">0.0 dB</span>
                    </div>
                </div>
            </div>
            <div class="communication-stats">
                <h4>Communication Paths</h4>
                <div class="path-stats">
                    <div>Base Station: <span id="base-station-connections">0</span></div>
                    <div>RSU: <span id="rsu-connections">0</span></div>
                    <div>V2V: <span id="v2v-connections">0</span></div>
                </div>
            </div>
            <div class="snr-quality-indicator">
                <h4>Signal Quality Distribution</h4>
                <div class="quality-bars">
                    <div class="quality-bar excellent">
                        <span class="quality-label">Excellent (>20dB)</span>
                        <div class="quality-progress">
                            <div class="quality-fill" id="excellent-quality" style="width: 0%;"></div>
                        </div>
                        <span class="quality-count" id="excellent-count">0</span>
                    </div>
                    <div class="quality-bar good">
                        <span class="quality-label">Good (15-20dB)</span>
                        <div class="quality-progress">
                            <div class="quality-fill" id="good-quality" style="width: 0%;"></div>
                        </div>
                        <span class="quality-count" id="good-count">0</span>
                    </div>
                    <div class="quality-bar acceptable">
                        <span class="quality-label">Acceptable (10-15dB)</span>
                        <div class="quality-progress">
                            <div class="quality-fill" id="acceptable-quality" style="width: 0%;"></div>
                        </div>
                        <span class="quality-count" id="acceptable-count">0</span>
                    </div>
                    <div class="quality-bar poor">
                        <span class="quality-label">Poor (<10dB)</span>
                        <div class="quality-progress">
                            <div class="quality-fill" id="poor-quality" style="width: 0%;"></div>
                        </div>
                        <span class="quality-count" id="poor-count">0</span>
                    </div>
                </div>
            </div>
        `;

        // Add CSS styles for SNR panel
        const style = document.createElement('style');
        style.textContent = `
            .snr-analytics-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #4CAF50;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 1000;
                max-height: 80vh;
                overflow-y: auto;
            }

            .snr-analytics-panel h3 {
                color: #4CAF50;
                margin: 0 0 15px 0;
                font-size: 16px;
                text-align: center;
            }

            .snr-analytics-panel h4 {
                color: #81C784;
                margin: 10px 0 8px 0;
                font-size: 14px;
                border-bottom: 1px solid #333;
                padding-bottom: 3px;
            }

            .network-performance .network-item {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                padding: 3px 0;
            }

            .network-label {
                color: #CCCCCC;
            }

            .network-value {
                color: #4CAF50;
                font-weight: bold;
            }

            .path-stats {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 10px;
                margin: 8px 0;
            }

            .path-stats div {
                text-align: center;
                padding: 5px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }

            .quality-bar {
                margin: 8px 0;
                padding: 5px;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.05);
            }

            .quality-bar.excellent { border-left: 4px solid #4CAF50; }
            .quality-bar.good { border-left: 4px solid #8BC34A; }
            .quality-bar.acceptable { border-left: 4px solid #FFC107; }
            .quality-bar.poor { border-left: 4px solid #F44336; }

            .quality-label {
                display: block;
                font-size: 11px;
                margin-bottom: 3px;
                color: #CCCCCC;
            }

            .quality-progress {
                background: rgba(255, 255, 255, 0.1);
                height: 8px;
                border-radius: 4px;
                overflow: hidden;
                margin: 3px 0;
            }

            .quality-fill {
                height: 100%;
                transition: width 0.3s ease;
            }

            .quality-bar.excellent .quality-fill { background: #4CAF50; }
            .quality-bar.good .quality-fill { background: #8BC34A; }
            .quality-bar.acceptable .quality-fill { background: #FFC107; }
            .quality-bar.poor .quality-fill { background: #F44336; }

            .quality-count {
                float: right;
                font-weight: bold;
                color: #4CAF50;
            }
        `;
        document.head.appendChild(style);

        // Insert the panel into the page
        document.body.appendChild(snrPanel);
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

        // Create status for each vehicle with SNR information
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

            // Get communication analytics
            const commAnalytics = vehicle.userData.communicationAnalytics;
            let snrInfo = 'N/A';
            let networkInfo = vehicle.userData.currentNetwork || 'None';
            let commTypeInfo = 'Unknown';
            
            if (commAnalytics && commAnalytics.selectedOption) {
                const selected = commAnalytics.selectedOption;
                snrInfo = `${selected.snr.toFixed(1)}dB`;
                networkInfo = selected.networkType;
                commTypeInfo = selected.type.toUpperCase();
                
                // Color code SNR
                let snrColor = '#4CAF50'; // Green
                if (selected.snr < 10) snrColor = '#F44336'; // Red
                else if (selected.snr < 15) snrColor = '#FF9800'; // Orange
                else if (selected.snr < 20) snrColor = '#FFC107'; // Yellow
                
                snrInfo = `<span style="color: ${snrColor}; font-weight: bold;">${snrInfo}</span>`;
            }

            const vehicleInfo = `
                <div class="vehicle-info">
                    <span class="vehicle-type">${vehicle.userData.type}</span>
                    <span class="vehicle-speed">${vehicle.userData.speed.toFixed(1)} m/s</span>
                </div>
                <div class="network-info">
                    <span class="network-type">📡 ${networkInfo} (${commTypeInfo})</span>
                </div>
                <div class="snr-info">
                    <span class="snr-value">SNR: ${snrInfo}</span>
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

    // New method to update SNR analytics
    updateSNRAnalytics(vehicles) {
        if (!vehicles || vehicles.length === 0) return;

        // Collect SNR data from all vehicles
        const snrData = {
            lte: [],
            wifi: [],
            dsrc: [],
            pathCounts: { base_station: 0, rsu: 0, vehicle: 0 },
            qualityCounts: { excellent: 0, good: 0, acceptable: 0, poor: 0 }
        };

        vehicles.forEach(vehicle => {
            const commAnalytics = vehicle.userData.communicationAnalytics;
            if (commAnalytics && commAnalytics.selectedOption) {
                const selected = commAnalytics.selectedOption;
                
                // Collect SNR by network type
                switch(selected.networkType) {
                    case 'LTE':
                        snrData.lte.push(selected.snr);
                        break;
                    case 'WIFI':
                        snrData.wifi.push(selected.snr);
                        break;
                    case 'DSRC':
                        snrData.dsrc.push(selected.snr);
                        break;
                }

                // Count communication paths
                snrData.pathCounts[selected.type]++;

                // Count quality levels
                if (selected.snr >= 20) {
                    snrData.qualityCounts.excellent++;
                } else if (selected.snr >= 15) {
                    snrData.qualityCounts.good++;
                } else if (selected.snr >= 10) {
                    snrData.qualityCounts.acceptable++;
                } else {
                    snrData.qualityCounts.poor++;
                }
            }
        });

        // Update average SNR displays
        const lteAvg = snrData.lte.length > 0 ? 
            (snrData.lte.reduce((a, b) => a + b, 0) / snrData.lte.length).toFixed(1) : '0.0';
        const wifiAvg = snrData.wifi.length > 0 ? 
            (snrData.wifi.reduce((a, b) => a + b, 0) / snrData.wifi.length).toFixed(1) : '0.0';
        const dsrcAvg = snrData.dsrc.length > 0 ? 
            (snrData.dsrc.reduce((a, b) => a + b, 0) / snrData.dsrc.length).toFixed(1) : '0.0';

        const lteElement = document.getElementById('lte-avg-snr');
        const wifiElement = document.getElementById('wifi-avg-snr');
        const dsrcElement = document.getElementById('dsrc-avg-snr');

        if (lteElement) lteElement.textContent = `${lteAvg} dB`;
        if (wifiElement) wifiElement.textContent = `${wifiAvg} dB`;
        if (dsrcElement) dsrcElement.textContent = `${dsrcAvg} dB`;

        // Update path counts
        const baseStationElement = document.getElementById('base-station-connections');
        const rsuElement = document.getElementById('rsu-connections');
        const v2vElement = document.getElementById('v2v-connections');

        if (baseStationElement) baseStationElement.textContent = snrData.pathCounts.base_station;
        if (rsuElement) rsuElement.textContent = snrData.pathCounts.rsu;
        if (v2vElement) v2vElement.textContent = snrData.pathCounts.vehicle;

        // Update quality distribution
        const totalVehicles = vehicles.length;
        const qualityElements = {
            excellent: document.getElementById('excellent-quality'),
            good: document.getElementById('good-quality'),
            acceptable: document.getElementById('acceptable-quality'),
            poor: document.getElementById('poor-quality')
        };

        const qualityCountElements = {
            excellent: document.getElementById('excellent-count'),
            good: document.getElementById('good-count'),
            acceptable: document.getElementById('acceptable-count'),
            poor: document.getElementById('poor-count')
        };

        Object.keys(qualityElements).forEach(quality => {
            const count = snrData.qualityCounts[quality];
            const percentage = totalVehicles > 0 ? (count / totalVehicles) * 100 : 0;
            
            if (qualityElements[quality]) {
                qualityElements[quality].style.width = `${percentage}%`;
            }
            if (qualityCountElements[quality]) {
                qualityCountElements[quality].textContent = count;
            }
        });
    }

    // New method to update distance analytics
    updateDistanceAnalytics(vehicles) {
        if (!vehicles || vehicles.length === 0) return;

        // Collect distance data from all vehicles
        const distanceData = {
            baseStation: [],
            rsu: [],
            averageDistances: {
                baseStation: 0,
                closestRSU: 0,
                allRSUs: []
            },
            pathEfficiency: {
                direct: 0,
                rsu: 0,
                optimal: 0
            }
        };

        vehicles.forEach(vehicle => {
            const userData = vehicle.userData;
            
            // Collect base station distances
            if (userData.baseStationDistance !== undefined) {
                distanceData.baseStation.push(userData.baseStationDistance);
            }

            // Collect RSU distances
            if (userData.rsuDistances && Array.isArray(userData.rsuDistances)) {
                userData.rsuDistances.forEach(distance => {
                    distanceData.rsu.push(distance);
                });
            }

            // Collect closest RSU distance
            if (userData.closestRSUDistance !== undefined) {
                distanceData.averageDistances.allRSUs.push(userData.closestRSUDistance);
            }

            // Collect path efficiency data
            if (userData.lastCommunicationPath) {
                const path = userData.lastCommunicationPath;
                if (path === 'direct') {
                    distanceData.pathEfficiency.direct++;
                } else if (path === 'rsu') {
                    distanceData.pathEfficiency.rsu++;
                }
            }
        });

        // Calculate averages
        if (distanceData.baseStation.length > 0) {
            distanceData.averageDistances.baseStation = 
                distanceData.baseStation.reduce((a, b) => a + b, 0) / distanceData.baseStation.length;
        }

        if (distanceData.averageDistances.allRSUs.length > 0) {
            distanceData.averageDistances.closestRSU = 
                distanceData.averageDistances.allRSUs.reduce((a, b) => a + b, 0) / distanceData.averageDistances.allRSUs.length;
        }

        // Update distance analytics display elements (if they exist)
        const baseStationAvgElement = document.getElementById('avg-base-station-distance');
        if (baseStationAvgElement) {
            baseStationAvgElement.textContent = `${distanceData.averageDistances.baseStation.toFixed(1)}m`;
        }

        const rsuAvgElement = document.getElementById('avg-rsu-distance');
        if (rsuAvgElement) {
            rsuAvgElement.textContent = `${distanceData.averageDistances.closestRSU.toFixed(1)}m`;
        }

        // Update path efficiency display
        const totalPaths = distanceData.pathEfficiency.direct + distanceData.pathEfficiency.rsu;
        if (totalPaths > 0) {
            const directPercentage = (distanceData.pathEfficiency.direct / totalPaths) * 100;
            const rsuPercentage = (distanceData.pathEfficiency.rsu / totalPaths) * 100;

            const directPathElement = document.getElementById('direct-path-percentage');
            if (directPathElement) {
                directPathElement.textContent = `${directPercentage.toFixed(1)}%`;
            }

            const rsuPathElement = document.getElementById('rsu-path-percentage');
            if (rsuPathElement) {
                rsuPathElement.textContent = `${rsuPercentage.toFixed(1)}%`;
            }
        }

        // Log distance analytics for debugging (every 60 frames)
        if (Math.random() < 0.016) { // Approximately every 60 frames at 60fps
            console.log('Distance Analytics:', {
                avgBaseStation: distanceData.averageDistances.baseStation.toFixed(1) + 'm',
                avgClosestRSU: distanceData.averageDistances.closestRSU.toFixed(1) + 'm',
                pathEfficiency: {
                    direct: distanceData.pathEfficiency.direct,
                    rsu: distanceData.pathEfficiency.rsu
                }
            });
        }
    }

    // New method to update RL statistics
    updateRLStats(rlStats) {
        if (!rlStats) return;

        // Update total reward
        const totalRewardElement = document.getElementById('total-reward');
        if (totalRewardElement && rlStats.totalReward !== undefined) {
            totalRewardElement.textContent = rlStats.totalReward.toFixed(2);
        }

        // Update average reward
        const averageRewardElement = document.getElementById('average-reward');
        if (averageRewardElement && rlStats.averageReward !== undefined) {
            averageRewardElement.textContent = rlStats.averageReward.toFixed(3);
        }

        // Update episode count
        const episodeCountElement = document.getElementById('episode-count');
        if (episodeCountElement && rlStats.episodeCount !== undefined) {
            episodeCountElement.textContent = rlStats.episodeCount;
        }

        // Update exploration rate (epsilon)
        const explorationRateElement = document.getElementById('exploration-rate');
        if (explorationRateElement && rlStats.epsilon !== undefined) {
            const epsilonPercentage = (rlStats.epsilon * 100).toFixed(1);
            explorationRateElement.textContent = `${epsilonPercentage}%`;
        }

        // Update learning progress bar
        const learningProgressElement = document.getElementById('learning-progress');
        if (learningProgressElement && rlStats.epsilon !== undefined) {
            // Progress is inverse of epsilon (as epsilon decreases, learning progresses)
            const progressPercentage = Math.max(0, (1 - rlStats.epsilon) * 100);
            learningProgressElement.style.width = `${progressPercentage.toFixed(1)}%`;
        }

        // Update Q-table size if available
        const qTableSizeElement = document.getElementById('q-table-size');
        if (qTableSizeElement && rlStats.qTableSize !== undefined) {
            qTableSizeElement.textContent = rlStats.qTableSize;
        }

        // Update message type statistics if available
        if (rlStats.messageTypeStats) {
            Object.entries(rlStats.messageTypeStats).forEach(([messageType, stats]) => {
                const countElement = document.getElementById(`${messageType.toLowerCase().replace('_', '-')}-count`);
                if (countElement && stats.count !== undefined) {
                    countElement.textContent = stats.count;
                }

                const rewardElement = document.getElementById(`${messageType.toLowerCase().replace('_', '-')}-reward`);
                if (rewardElement && stats.totalReward !== undefined) {
                    rewardElement.textContent = stats.totalReward.toFixed(2);
                }
            });
        }

        // Log RL stats for debugging (occasionally)
        if (Math.random() < 0.01) { // Approximately every 100 frames at 60fps
            console.log('RL Stats Update:', {
                totalReward: rlStats.totalReward?.toFixed(2),
                averageReward: rlStats.averageReward?.toFixed(3),
                epsilon: (rlStats.epsilon * 100)?.toFixed(1) + '%',
                episodes: rlStats.episodeCount,
                qTableSize: rlStats.qTableSize
            });
        }
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