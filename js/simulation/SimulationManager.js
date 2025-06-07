export class SimulationManager {
    constructor(config, sceneManager, vehicleManager, networkManager, uiManager) {
        this.config = config;
        this.sceneManager = sceneManager;
        this.vehicleManager = vehicleManager;
        this.networkManager = networkManager;
        this.uiManager = uiManager;
        this.isRunning = false;
        this.lastUpdateTime = 0;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastUpdateTime = performance.now();
            this.uiManager.updateButtonStates(true);
            this.uiManager.resetStats();
        }
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.uiManager.updateButtonStates(false);
            this.vehicleManager.clearCommunicationLines();
        }
    }

    update() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;

        // Update vehicle positions
        this.vehicleManager.updateVehicles();

        // Simulate vehicle communication
        this.vehicleManager.vehicles.forEach(vehicle => {
            if (currentTime - vehicle.userData.lastPacketTime >= this.config.NETWORK.PACKET_INTERVAL) {
                this.networkManager.simulatePacketTransfer(
                    vehicle,
                    () => {
                        this.uiManager.incrementPacketsReceived();
                        this.vehicleManager.showSuccessfulCommunication(vehicle);
                    },
                    (reason) => {
                        this.uiManager.incrementPacketsLost();
                        this.vehicleManager.showFailedCommunication(vehicle, reason);
                    }
                );
                vehicle.userData.lastPacketTime = currentTime;
                this.uiManager.incrementPacketsSent();
            }
        });

        // Update UI
        this.uiManager.updateFPS();
        this.lastUpdateTime = currentTime;
    }
} 