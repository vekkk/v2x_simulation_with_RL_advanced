import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { CONFIG } from './config/config.js';
import { SceneManager } from './visuals/SceneManager.js';
import { VehicleManager } from './vehicles/VehicleManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { UIManager } from './ui/UIManager.js';
import { PlotManager } from './analytics/PlotManager.js';

export class SimulationManager {
    constructor() {
        console.log('SimulationManager: Initializing...');
        this.isRunning = false;
        this.clock = new THREE.Clock();
        this.fps = 0;
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
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
            
            // Initialize PlotManager for performance analytics
            this.plotManager = new PlotManager();
            
            // Connect PlotManager to NetworkManager
            this.networkManager.setPlotManager(this.plotManager);
            
            // Make PlotManager globally accessible for UI buttons
            window.plotManager = this.plotManager;
            
            // Initialize vehicles now that scene is ready
            this.vehicleManager.initializeVehicles();
            
            // Create UI manager with bound callbacks
            this.uiManager = new UIManager();
            this.uiManager.setStartCallback(() => this.start());
            this.uiManager.setStopCallback(() => this.stop());
            
            // Now that all managers are initialized, store the reference and update base station position
            this.scene.userData.sceneManager = this.sceneManager;
            this.networkManager.updateBaseStationPosition(this.sceneManager);
            
            // Share RSU positions with NetworkManager for proper V2X communication
            if (this.sceneManager.rsuPositions && this.sceneManager.rsuPositions.length > 0) {
                this.networkManager.setRSUPositions(this.sceneManager.rsuPositions);
                console.log('RSU positions shared with NetworkManager:', this.sceneManager.rsuPositions.length, 'RSUs');
            } else {
                console.warn('No RSU positions found in SceneManager');
            }
            
            // Connect managers
            this.vehicleManager.setNetworkManager(this.networkManager);

            // Setup event listeners
            this.setupEventListeners();

            // Enable start button now that everything is initialized
            this.uiManager.setSimulationRunning(false);

            console.log('SimulationManager: Initialization complete with analytics');
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
        this.frameCount = 0;
        this.lastFPSUpdate = performance.now();
        this.uiManager.setSimulationRunning(true);
        this.animate();
    }

    stop() {
        console.log('SimulationManager: Stopping simulation...');
        this.isRunning = false;
        this.clock.stop();
        
        // Get final stats before any resets
        const finalStats = this.getComprehensiveStats();
        
        // Update UI with final stats
        console.log('Final Stats:', finalStats);
        this.uiManager.updateStats(finalStats);
        this.uiManager.updateVehicleSummary(finalStats.vehicleSummary);
        this.uiManager.setSimulationRunning(false);
        
        // Reset vehicles but keep network stats
        this.vehicleManager.resetVehicles();
    }

    animate() {
        if (!this.isRunning) return;

        const deltaTime = this.clock.getDelta();
        const currentTime = this.clock.getElapsedTime() * 1000; // Convert to milliseconds

        // Update FPS calculation
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFPSUpdate >= 1000) { // Update FPS every second
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }

        // Update scene manager (base station movement, etc.)
        this.sceneManager.update(deltaTime);

        // Update network
        this.networkManager.update(deltaTime, currentTime);

        // Update vehicles
        this.vehicleManager.updatePositions(deltaTime, currentTime);

        // Update UI with comprehensive stats
        this.updateComprehensiveUI();

        // Update analytics
        if (this.plotManager) {
            this.plotManager.update();
        }

        // Render scene
        this.sceneManager.render();

        requestAnimationFrame(() => this.animate());
    }

    getComprehensiveStats() {
        // Get network statistics
        const networkStats = this.networkManager.getStats();
        
        // Get AI statistics
        const aiStats = this.networkManager.ai.getStats();
        
        // Get vehicle summary
        const vehicleSummary = this.vehicleManager.getVehicleSummary();
        
        // Get message type statistics
        const messageTypeStats = this.vehicleManager.getMessageTypeStatistics();
        
        return {
            // Basic network stats
            totalSent: networkStats.packetsSent,
            totalReceived: networkStats.packetsReceived,
            totalLost: networkStats.packetsLost,
            averageLatency: networkStats.averageLatency,
            totalDataKB: networkStats.totalDataKB,
            handoverCount: networkStats.handoverCount,
            fps: this.fps,
            
            // Per-network statistics
            networkStats: networkStats.networkStats,
            
            // AI/RL statistics
            rlStats: {
                totalReward: aiStats.totalReward,
                averageReward: aiStats.averageReward,
                episodeCount: aiStats.episodeCount,
                epsilon: aiStats.epsilon,
                qTableSize: aiStats.qTableSize,
                messageTypeStats: aiStats.messageTypeStats
            },
            
            // AI epsilon for main display
            aiEpsilon: aiStats.epsilon,
            
            // Message type statistics
            messageTypeStats: messageTypeStats,
            
            // Vehicle summary
            vehicleSummary: vehicleSummary
        };
    }

    updateComprehensiveUI() {
        const stats = this.getComprehensiveStats();
        
        // Update main UI with comprehensive stats
        this.uiManager.updateStats(stats);
        
        // Update vehicle summary
        this.uiManager.updateVehicleSummary(stats.vehicleSummary);
        
        // Update vehicle status display
        this.uiManager.updateVehicleStatus(this.vehicleManager.vehicles);
        
        // Log periodic updates for debugging
        if (this.frameCount % 60 === 0) { // Log every 60 frames
            console.log('Simulation Stats Update:', {
                packets: {
                    sent: stats.totalSent,
                    received: stats.totalReceived,
                    lost: stats.totalLost
                },
                ai: {
                    epsilon: stats.aiEpsilon.toFixed(3),
                    totalReward: stats.rlStats.totalReward.toFixed(2),
                    averageReward: stats.rlStats.averageReward.toFixed(3)
                },
                messageTypes: stats.messageTypeStats,
                fps: stats.fps
            });
        }
    }

    // Legacy method for backward compatibility
    updateStats() {
        // This method is now handled by updateComprehensiveUI()
        // Keeping it for any legacy calls
        this.updateComprehensiveUI();
    }

    // Method to reset all statistics
    resetAllStats() {
        console.log('SimulationManager: Resetting all statistics...');
        
        // Reset network stats
        this.networkManager.resetStats();
        
        // Reset AI learning
        this.networkManager.ai.reset();
        
        // Reset vehicle stats
        this.vehicleManager.resetVehicles();
        
        // Reset UI displays
        this.uiManager.resetNetworkStats();
        this.uiManager.resetMessageTypeStats();
        this.uiManager.resetRLStats();
        this.uiManager.resetVehicleStatus();
        
        console.log('All statistics reset');
    }

    // Method to get current simulation state
    getSimulationState() {
        return {
            isRunning: this.isRunning,
            elapsedTime: this.clock.getElapsedTime(),
            fps: this.fps,
            vehicleCount: this.vehicleManager.vehicles.length,
            stats: this.getComprehensiveStats()
        };
    }
} 