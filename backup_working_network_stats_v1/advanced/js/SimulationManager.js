// DISABLED: import * as THREE from 'three';
import { CONFIG } from './config/config.js';
import { SceneManager } from './visuals/SceneManager.js';
import { VehicleManager } from './vehicles/VehicleManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { UIManager } from './ui/UIManager.js';

export class SimulationManager {
    constructor() {
        console.log('SimulationManager: Initializing...');
        this.isRunning = false;
        this.clock = new THREE.Clock();
        
        // Create managers first
        this.sceneManager = new SceneManager();
        this.vehicleManager = new VehicleManager(this.sceneManager.scene);
        this.networkManager = new NetworkManager(this.sceneManager.scene, this.vehicleManager);
        
        // Connect managers
        this.vehicleManager.setNetworkManager(this.networkManager);
        
        // Define callbacks after methods are available
        this.startCallback = this.start.bind(this);
        this.stopCallback = this.stop.bind(this);
        
        // Create UI manager with bound callbacks
        this.uiManager = new UIManager(this.startCallback, this.stopCallback);

        // Setup event listeners
        this.setupEventListeners();
        
        // Setup UI callbacks
        this.setupUICallbacks();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.sceneManager.handleResize();
        });
    }

    setupUICallbacks() {
        this.uiManager.setStartCallback(() => this.start());
        this.uiManager.setStopCallback(() => this.stop());
    }

    start() {
        console.log('SimulationManager: Starting simulation...');
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.clock.start();
        this.uiManager.setSimulationRunning(true);
        this.animate();
    }

    stop() {
        console.log('SimulationManager: Stopping simulation...');
        this.isRunning = false;
        this.clock.stop();
        
        // Get final stats before any resets
        const finalStats = this.networkManager.getStats();
        const vehicleSummary = this.vehicleManager.getVehicleSummary();
        
        // Update UI with final stats
        const stats = {
            totalSent: finalStats.packetsSent,
            totalReceived: finalStats.packetsReceived,
            totalLost: finalStats.packetsLost,
            fps: 0, // Set to 0 since simulation is stopped
            aiEpsilon: this.networkManager.getAIEpsilon(),
            networkStats: finalStats.networkStats,
            averageLatency: finalStats.averageLatency,
            totalDataKB: finalStats.totalDataKB,
            handoverCount: finalStats.handoverCount
        };
        
        console.log('Final Stats:', stats);
        this.uiManager.updateStats(stats);
        this.uiManager.updateVehicleSummary(vehicleSummary);
        this.uiManager.setSimulationRunning(false);
        
        // Reset vehicles but keep network stats
        this.vehicleManager.resetVehicles();
    }

    animate() {
        if (!this.isRunning) return;

        const deltaTime = this.clock.getDelta();
        const currentTime = this.clock.getElapsedTime() * 1000; // Convert to milliseconds

        console.log('Simulation Update:', {
            deltaTime,
            currentTime,
            vehicleCount: this.vehicleManager.vehicles.length
        });

        // Update network
        this.networkManager.update(deltaTime, currentTime);

        // Update vehicles
        this.vehicleManager.updatePositions(deltaTime, currentTime);

        // Update UI
        this.updateStats();
        this.uiManager.updateFPS(1 / deltaTime);
        this.uiManager.updateVehicleStatus(this.vehicleManager.vehicles);

        // Render scene
        this.sceneManager.render();

        requestAnimationFrame(() => this.animate());
    }

    updateStats() {
        const networkStats = this.networkManager.getStats();
        const stats = {
            totalSent: networkStats.packetsSent,
            totalReceived: networkStats.packetsReceived,
            totalLost: networkStats.packetsLost,
            fps: 1 / this.clock.getDelta(),
            aiEpsilon: this.networkManager.getAIEpsilon(),
            networkStats: networkStats.networkStats,
            averageLatency: networkStats.averageLatency,
            totalDataKB: networkStats.totalDataKB,
            handoverCount: networkStats.handoverCount
        };
        
        console.log('Updating UI Stats:', stats);
        this.uiManager.updateStats(stats);
    }
} 