export class UIManager {
    constructor() {
        console.log('UIManager: Initializing...');
        this.startButton = document.getElementById('start-btn');
        this.stopButton = document.getElementById('stop-btn');
        this.fpsElement = document.getElementById('fps');
        this.packetsSentElement = document.getElementById('packets-sent');
        this.packetsReceivedElement = document.getElementById('packets-received');
        this.packetsLostElement = document.getElementById('packets-lost');
        this.vehicleStatusContainer = document.getElementById('vehicle-status-container');
        
        console.log('UIManager: Buttons found:', {
            startButton: this.startButton ? 'Found' : 'Not Found',
            stopButton: this.stopButton ? 'Found' : 'Not Found',
            startButtonId: 'start-btn',
            stopButtonId: 'stop-btn'
        });

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
                    this.startCallback();
                } else {
                    console.warn('UIManager: No start callback set');
                }
            });
        }

        if (this.stopButton) {
            console.log('UIManager: Adding click listener to stop button');
            this.stopButton.addEventListener('click', () => {
                console.log('UIManager: Stop button clicked');
                if (this.stopCallback) {
                    console.log('UIManager: Calling stop callback');
                    this.stopCallback();
                } else {
                    console.warn('UIManager: No stop callback set');
                }
            });
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
        if (this.packetsSentElement) {
            this.packetsSentElement.textContent = stats.packetsSent;
        }
        if (this.packetsReceivedElement) {
            this.packetsReceivedElement.textContent = stats.packetsReceived;
        }
        if (this.packetsLostElement) {
            this.packetsLostElement.textContent = stats.packetsLost;
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
        if (this.packetsSentElement) {
            this.packetsSentElement.textContent = '0';
        }
        if (this.packetsReceivedElement) {
            this.packetsReceivedElement.textContent = '0';
        }
        if (this.packetsLostElement) {
            this.packetsLostElement.textContent = '0';
        }
    }
} 