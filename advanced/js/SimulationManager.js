import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
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
    }

    async initializeManagers() {
        try {
            // Initialize scene manager first and wait for it to be ready
            this.sceneManager = new SceneManager();
            console.log('SceneManager created, initializing...');
            await this.sceneManager.initialize();
            console.log('SceneManager initialized');
            
            // Get the scene after initialization
            this.scene = this.sceneManager.scene;
            if (!this.scene) {
                throw new Error('Scene not initialized properly');
            }
            
            // Initialize other managers after scene is ready
            this.vehicleManager = new VehicleManager(this.scene);
            this.networkManager = new NetworkManager(this.scene, this.vehicleManager);
            
            // Create UI manager with bound callbacks
            this.uiManager = new UIManager();
            this.uiManager.setStartCallback(() => this.start());
            this.uiManager.setStopCallback(() => this.stop());
            
            // Now that all managers are initialized, store the reference and update base station position
            this.scene.userData.sceneManager = this.sceneManager;
            this.networkManager.updateBaseStationPosition(this.sceneManager);
            
            // Connect managers
            this.vehicleManager.setNetworkManager(this.networkManager);

            // Setup event listeners
            this.setupEventListeners();

            console.log('SimulationManager: Initialization complete');
        } catch (error) {
            console.error('Error initializing simulation:', error);
            throw error;
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.sceneManager.handleResize();
        });
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
        
        // Update UI with final stats - use same property names as running state
        const stats = {
            packetsSent: finalStats.packetsSent,
            packetsReceived: finalStats.packetsReceived,
            packetsLost: finalStats.packetsLost,
            fps: 0, // Set to 0 since simulation is stopped
            averageLatency: finalStats.averageLatency,
            totalData: finalStats.totalDataTransferred,
            handovers: finalStats.handoverCount
        };

        // Add network-specific stats
        for (const network of ['dsrc', 'wifi', 'lte']) {
            stats[`${network}Sent`] = finalStats.networkStats[network.toUpperCase()].sent;
            stats[`${network}Received`] = finalStats.networkStats[network.toUpperCase()].received;
            stats[`${network}Lost`] = finalStats.networkStats[network.toUpperCase()].lost;
        }
        
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
        const stats = {
            packetsSent: this.networkManager.stats.packetsSent,
            packetsReceived: this.networkManager.stats.packetsReceived,
            packetsLost: this.networkManager.stats.packetsLost,
            fps: 1 / this.clock.getDelta(),
            averageLatency: this.networkManager.stats.totalLatency / (this.networkManager.stats.packetsReceived || 1),
            totalData: this.networkManager.stats.totalDataTransferred,
            handovers: this.networkManager.stats.handoverCount,
            aiProgress: this.networkManager.getAILearningProgress()
        };

        // Add network-specific stats
        for (const network of ['dsrc', 'wifi', 'lte']) {
            stats[`${network}Sent`] = this.networkManager.stats.networkStats[network.toUpperCase()].sent;
            stats[`${network}Received`] = this.networkManager.stats.networkStats[network.toUpperCase()].received;
            stats[`${network}Lost`] = this.networkManager.stats.networkStats[network.toUpperCase()].lost;
        }

        this.uiManager.updateStats(stats);
    }
} 