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
        this.handoverCountElement = document.getElementById('handover-count');
        this.vehicleStatusContainer = document.getElementById('vehicle-status-container');
        this.aiEpsilonElement = document.getElementById('ai-epsilon');
        
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

        // Update basic stats
        if (this.packetsSentElement) {
            this.packetsSentElement.textContent = stats.packetsSent || 0;
            console.log('Updated packets sent:', stats.packetsSent || 0);
        }
        if (this.packetsReceivedElement) {
            this.packetsReceivedElement.textContent = stats.packetsReceived || 0;
            console.log('Updated packets received:', stats.packetsReceived || 0);
        }
        if (this.packetsLostElement) {
            this.packetsLostElement.textContent = stats.packetsLost || 0;
            console.log('Updated packets lost:', stats.packetsLost || 0);
        }
        if (this.fpsElement) {
            this.fpsElement.textContent = stats.fps.toFixed(1);
            console.log('Updated FPS:', stats.fps.toFixed(1));
        }
        if (this.avgLatencyElement) {
            const latency = typeof stats.averageLatency === 'number' ? stats.averageLatency : 0;
            this.avgLatencyElement.textContent = `${latency.toFixed(1)} ms`;
            console.log('Updated average latency:', `${latency.toFixed(1)} ms`);
        }
        if (this.totalDataElement) {
            this.totalDataElement.textContent = `${(stats.totalData / 1024).toFixed(1)} KB`;
            console.log('Updated total data:', `${(stats.totalData / 1024).toFixed(1)} KB`);
        }
        if (this.handoverCountElement) {
            this.handoverCountElement.textContent = stats.handovers || 0;
            console.log('Updated handover count:', stats.handovers || 0);
        }

        // Update network-specific stats
        for (const network of ['dsrc', 'wifi', 'lte']) {
            const elements = this.networkStatsElements[network.toUpperCase()];
            if (elements) {
                if (elements.sent) {
                    elements.sent.textContent = stats[`${network}Sent`] || 0;
                    console.log(`Updated ${network} sent:`, stats[`${network}Sent`] || 0);
                }
                if (elements.received) {
                    elements.received.textContent = stats[`${network}Received`] || 0;
                    console.log(`Updated ${network} received:`, stats[`${network}Received`] || 0);
                }
                if (elements.lost) {
                    elements.lost.textContent = stats[`${network}Lost`] || 0;
                    console.log(`Updated ${network} lost:`, stats[`${network}Lost`] || 0);
                }
            }
        }

        // Update AI learning progress if available
        if (stats.aiProgress !== undefined) {
            const progressElement = document.getElementById('ai-progress');
            if (progressElement) {
                progressElement.textContent = `${stats.aiProgress.toFixed(1)}%`;
                console.log('Updated AI progress:', `${stats.aiProgress.toFixed(1)}%`);
            }
        }
    }

    updateFPS(fps) {
        if (this.fpsElement) {
            this.fpsElement.textContent = fps.toFixed(1);
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

            const vehicleInfo = `
                <div class="vehicle-info">
                    <span class="vehicle-type">${vehicle.userData.type}</span>
                    <span class="vehicle-speed">${vehicle.userData.speed.toFixed(1)} m/s</span>
                </div>
                <div class="network-info">
                    <span class="network-type">Network: ${vehicle.userData.currentNetwork || 'None'}</span>
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
        if (!this.vehicleStatusContainer) {
            console.warn('UIManager: Vehicle status container not found');
            return;
        }

        // Clear existing status
        this.vehicleStatusContainer.innerHTML = '';

        // Add summary header
        const summaryHeader = document.createElement('div');
        summaryHeader.className = 'vehicle-status';
        summaryHeader.style.borderLeftColor = '#2196F3';
        summaryHeader.innerHTML = `
            <div class="vehicle-info">
                <span class="vehicle-type">Total Vehicles: ${summary.totalVehicles}</span>
            </div>
        `;
        this.vehicleStatusContainer.appendChild(summaryHeader);

        // Add vehicle type breakdown
        Object.entries(summary.byType).forEach(([type, count]) => {
            const typeDiv = document.createElement('div');
            typeDiv.className = 'vehicle-status';
            typeDiv.style.borderLeftColor = '#2196F3';
            typeDiv.innerHTML = `
                <div class="vehicle-info">
                    <span class="vehicle-type">${type}: ${count}</span>
                </div>
            `;
            this.vehicleStatusContainer.appendChild(typeDiv);
        });

        // Add network usage breakdown
        const networkDiv = document.createElement('div');
        networkDiv.className = 'vehicle-status';
        networkDiv.style.borderLeftColor = '#2196F3';
        networkDiv.innerHTML = `
            <div class="vehicle-info">
                <span class="vehicle-type">Network Usage:</span>
            </div>
            <div class="network-info">
                ${Object.entries(summary.byNetwork)
                    .map(([network, count]) => `${network}: ${count}`)
                    .join('<br>')}
            </div>
        `;
        this.vehicleStatusContainer.appendChild(networkDiv);
    }
} 