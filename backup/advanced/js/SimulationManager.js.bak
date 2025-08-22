import * as THREE from 'three';
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
        
        // Create managers
        this.sceneManager = new SceneManager();
        this.vehicleManager = new VehicleManager(this.sceneManager.scene);
        this.networkManager = new NetworkManager(this.sceneManager.scene, this.sceneManager.tower);
        this.uiManager = new UIManager();

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
        this.uiManager.setSimulationRunning(false);
        this.vehicleManager.resetVehicles();
        this.networkManager.resetStats();
        this.uiManager.resetNetworkStats();
        this.uiManager.resetVehicleStatus();
    }

    animate() {
        if (!this.isRunning) return;

        const deltaTime = this.clock.getDelta();
        const currentTime = this.clock.getElapsedTime() * 1000; // Convert to milliseconds

        // Update network
        this.networkManager.update(deltaTime, currentTime);

        // Update vehicles
        this.vehicleManager.updatePositions(deltaTime);

        // Update UI
        this.uiManager.updateStats(this.networkManager.getStats());
        this.uiManager.updateFPS(1 / deltaTime);
        this.uiManager.updateVehicleStatus(this.vehicleManager.vehicles);

        // Render scene
        this.sceneManager.render();

        requestAnimationFrame(() => this.animate());
    }
} 