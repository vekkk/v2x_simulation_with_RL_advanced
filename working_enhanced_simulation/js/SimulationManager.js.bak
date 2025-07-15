import * as THREE from 'https://cdn.skypack.dev/three@0.160.0';
import { CONFIG } from './config/config.js';
import { SceneManager } from './visuals/SceneManager.js';
import { VehicleManager } from './vehicles/VehicleManager.js';
import { EnhancedVisualNetworkManager } from './network/EnhancedVisualNetworkManager.js';
import { UIManager } from './ui/UIManager.js';
import { PlotManager } from './analytics/PlotManager.js';
import { ProcessingManager } from './processing/ProcessingManager.js';
import { TrafficLightController } from './traffic/TrafficLightController.js';
import { RSUAgent } from './ai/RSUAgent.js';
import { AIManager } from './ai/AIManager.js';
import { AIIntegration } from './ai/AIIntegration.js';

export class SimulationManager {
    constructor() {
        // Initialize scene manager first since other managers depend on it
        this.sceneManager = new SceneManager();
        
        // Get the scene from SceneManager after it's created
        // Note: We'll set this properly after scene initialization
        this.scene = null;
        
        // Initialize managers that don't need scene immediately
        // NetworkManager will be initialized after scene is ready
        this.networkManager = null;
        this.uiManager = new UIManager();
        this.plotManager = new PlotManager();
        
        // These will be initialized after scene is ready
        this.vehicleManager = null;
        this.processingManager = null;
        
        // Initialize AI and traffic systems
        this.aiManager = new AIManager();
        this.trafficLightController = new TrafficLightController();
        
        // Enhanced AI systems
        this.rsuAgents = new Map();
        
        // New AI Integration for advanced features
        this.aiIntegration = new AIIntegration();
        
        // Simulation state
        this.isRunning = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.deltaTime = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        // Bind the update method to maintain context
        this.update = this.update.bind(this);
        
        console.log('🎮 SimulationManager initialized with enhanced AI systems');
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Enhanced V2X Simulation...');
            
            // Initialize scene first
            await this.sceneManager.initialize();
            
            // Get the scene object after initialization
            this.scene = this.sceneManager.scene;
            
            // Now initialize managers that need the scene
            this.vehicleManager = new VehicleManager(this.scene);
            this.processingManager = new ProcessingManager(this.scene);
            
            // Initialize NetworkManager with proper parameters
            this.networkManager = new EnhancedVisualNetworkManager(this.scene, this.vehicleManager);
            
            // Set up cross-manager references
            this.networkManager.setPlotManager(this.plotManager);
            this.networkManager.setProcessingManager(this.processingManager);
            this.networkManager.setRSUPositions(this.sceneManager.rsuPositions || []);
            this.networkManager.updateBaseStationPosition(this.sceneManager);
            
            // Initialize vehicles now that scene is available
            if (this.vehicleManager.initializeVehicles) {
                this.vehicleManager.initializeVehicles();
            }
            
            // Set up VehicleManager references
            this.vehicleManager.setNetworkManager(this.networkManager);
            this.vehicleManager.setProcessingManager(this.processingManager);
            
            // Initialize AI manager with simulation components
            this.aiManager.initialize(this.sceneManager, this.networkManager, this.vehicleManager);
            
            // Initialize new AI integration with simulation components
            this.aiIntegration.integrate(this.networkManager, this.vehicleManager, this.sceneManager);
            
            // ProcessingManager needs positions for initialization
            if (this.processingManager.initializeProcessingUnits) {
                const baseStationPos = this.sceneManager.baseStationPosition || { x: 0, y: 0, z: 0 };
                const rsuPositions = this.sceneManager.rsuPositions || [];
                this.processingManager.initializeProcessingUnits(baseStationPos, rsuPositions);
            }
            
            // Initialize traffic light system
            this.initializeTrafficLightSystem();
            
            // Connect VehicleManager to TrafficLightController for traffic light awareness
            this.vehicleManager.setTrafficLightController(this.trafficLightController);
            
            // Initialize RSU AI agents
            this.initializeRSUAgents();
            
            // Setup update callbacks
            this.setupUpdateCallbacks();
            
            // Setup UI callbacks for start/stop buttons
            this.setupUICallbacks();
            
            console.log('✅ Enhanced simulation initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize simulation:', error);
            return false;
        }
    }

    initializeTrafficLightSystem() {
        // Get intersection data from scene manager
        const intersectionData = this.sceneManager.intersectionPositions.map((pos, index) => ({
            id: `intersection_${index}`,
            position: pos,
            directions: ['north', 'south', 'east', 'west'],
            timing: {
                greenTime: 30000,  // 30 seconds
                yellowTime: 3000,  // 3 seconds
                redTime: 2000,     // 2 seconds (all red)
                minGreen: 15000,   // Minimum green time
                maxGreen: 60000    // Maximum green time
            },
            priority: index === 0 ? 'high' : 'normal' // Center intersection has high priority
        }));
        
        // Initialize traffic light controller
        this.trafficLightController.initializeIntersections(intersectionData);
        
        console.log('🚦 Traffic light system initialized with', intersectionData.length, 'intersections');
    }

    initializeRSUAgents() {
        // Get RSU data from scene manager
        if (this.sceneManager.rsuData) {
            this.sceneManager.rsuData.forEach(rsuData => {
                const agent = new RSUAgent(rsuData.id, rsuData.position, {
                    coverage: rsuData.coverage,
                    processingCapacity: 100,
                    networkInterfaces: ['DSRC', 'WIFI', 'LTE']
                });
                
                this.rsuAgents.set(rsuData.id, agent);
            });
            
            // Setup neighbor relationships for cooperation
            this.setupRSUNeighbors();
            
            console.log('🤖 RSU AI agents initialized:', this.rsuAgents.size, 'agents');
        }
    }

    setupRSUNeighbors() {
        const rsuArray = Array.from(this.rsuAgents.values());
        const maxNeighborDistance = 120; // Maximum distance for neighbor relationships
        
        rsuArray.forEach(rsu1 => {
            rsuArray.forEach(rsu2 => {
                if (rsu1.id !== rsu2.id) {
                    const distance = rsu1.position.distanceTo(rsu2.position);
                    if (distance <= maxNeighborDistance) {
                        rsu1.addNeighbor(rsu2.id, rsu2.position);
                    }
                }
            });
        });
    }

    setupUpdateCallbacks() {
        // Setup vehicle manager callback for RSU processing (if method exists)
        if (this.vehicleManager.setMessageCallback) {
            this.vehicleManager.setMessageCallback((vehicle, message) => {
                this.handleVehicleMessage(vehicle, message);
            });
        }
        
        // Setup network manager callback for traffic optimization (if method exists)
        if (this.networkManager.setTrafficCallback) {
            this.networkManager.setTrafficCallback((trafficData) => {
                this.trafficLightController.updateGlobalTrafficState(trafficData);
            });
        }
    }

    handleVehicleMessage(vehicle, message) {
        // Find nearest RSU for message processing
        const nearestRSU = this.findNearestRSU(vehicle.position);
        
        if (nearestRSU) {
            // Process message through RSU AI agent
            nearestRSU.agent.update(message, {
                vehiclePosition: vehicle.position,
                vehicleSpeed: vehicle.speed,
                timestamp: this.currentTime
            });
        }
        
        // Also process through processing manager for load balancing
        this.processingManager.processMessage(message, vehicle.position);
    }

    findNearestRSU(position) {
        let nearestRSU = null;
        let minDistance = Infinity;
        
        for (const [rsuId, agent] of this.rsuAgents) {
            const distance = position.distanceTo(agent.position);
            if (distance < minDistance && distance <= agent.capabilities.coverage) {
                minDistance = distance;
                nearestRSU = { id: rsuId, agent: agent, distance: distance };
            }
        }
        
        return nearestRSU;
    }

    update() {
        if (!this.isRunning || this.isPaused) return;
        
        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.currentTime += this.deltaTime;
        this.frameCount++;
        
        // Update FPS counter
        if (currentTime - this.lastFpsUpdate > 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
        
        try {
            // Update all managers with safe method calls
            
            // VehicleManager uses updatePositions, not update
            if (this.vehicleManager && this.vehicleManager.updatePositions) {
                this.vehicleManager.updatePositions(this.deltaTime, currentTime);
            }
            
            // NetworkManager update (if exists)
            if (this.networkManager && this.networkManager.update) {
                this.networkManager.update(this.deltaTime);
            }
            
            // AIManager update (if exists)
            if (this.aiManager && this.aiManager.update) {
                this.aiManager.update(this.deltaTime);
            }
            
            // New AI Integration update
            if (this.aiIntegration && this.aiIntegration.update) {
                this.aiIntegration.update(this.deltaTime);
            }
            
            // ProcessingManager update (if exists)
            if (this.processingManager && this.processingManager.update) {
                this.processingManager.update(this.deltaTime);
            }
            
            // Update enhanced AI systems
            this.updateTrafficLights();
            this.updateRSUAgents();
            
            // Update scene (if method exists)
            if (this.sceneManager && this.sceneManager.update) {
                this.sceneManager.update(this.deltaTime);
            }
            
            // Render the scene (CRITICAL: This was missing!)
            if (this.sceneManager && this.sceneManager.render) {
                this.sceneManager.render();
            }
            
            // Update UI periodically
            if (this.frameCount % 30 === 0) { // Update UI every 30 frames (~0.5 seconds)
                this.updateComprehensiveUI();
            }
            
        } catch (error) {
            console.error('❌ Error in simulation update:', error);
        }
        
        // Continue animation loop
        requestAnimationFrame(this.update);
    }

    updateTrafficLights() {
        // Get actual vehicle objects (not just positions) for traffic detection
        const vehicles = this.vehicleManager.vehicles || [];
        
        // Update traffic light controller with vehicles and deltaTime
        this.trafficLightController.update(vehicles, this.deltaTime);
        
        // Get updated traffic light states
        const trafficLightStates = this.trafficLightController.getTrafficLightStates();
        
        // Update visual traffic lights in scene (if method exists)
        if (this.sceneManager.updateTrafficLights) {
            this.sceneManager.updateTrafficLights(trafficLightStates);
        }
        
        // Update vehicle manager with traffic light states for navigation (if method exists)
        if (this.vehicleManager.updateTrafficLights) {
            this.vehicleManager.updateTrafficLights(trafficLightStates);
        }
    }

    updateRSUAgents() {
        // Update each RSU agent
        for (const [rsuId, agent] of this.rsuAgents) {
            // Get local traffic and network conditions (with safe method calls)
            const localConditions = {
                networkLoad: this.networkManager.getLocalNetworkLoad ? 
                    this.networkManager.getLocalNetworkLoad(agent.position) : 0,
                vehicleCount: this.vehicleManager.getVehicleCountInRange ? 
                    this.vehicleManager.getVehicleCountInRange(agent.position, agent.capabilities.coverage) : 0,
                processingLoad: this.processingManager.getProcessorLoad ? 
                    this.processingManager.getProcessorLoad(rsuId) : 0,
                timestamp: this.currentTime
            };
            
            // Update agent with current conditions (if method exists)
            if (agent.updateConditions) {
                agent.updateConditions(localConditions);
            }
        }
    }

    getComprehensiveStats() {
        const networkStats = this.networkManager.getStats();
        const aiStats = this.aiManager.getStats();
        const vehicleSummary = this.vehicleManager.getSummary ? 
            this.vehicleManager.getSummary() : 
            (this.vehicleManager.getVehicleSummary ? this.vehicleManager.getVehicleSummary() : {});
        const processingStats = this.processingManager ? this.processingManager.getStats() : null;
        
        // Get enhanced AI stats (with safe method calls)
        const trafficStats = this.trafficLightController.getPerformanceStats ? 
            this.trafficLightController.getPerformanceStats() : {};
        const rsuStats = this.getRSUAgentStats();
        
        return {
            networkStats,
            aiStats,
            vehicleSummary,
            processingStats,
            trafficStats,
            rsuStats,
            timestamp: Date.now()
        };
    }

    getRSUAgentStats() {
        const stats = {
            totalAgents: this.rsuAgents.size,
            averageLoad: 0,
            totalMessagesProcessed: 0,
            averageResponseTime: 0,
            cooperationEvents: 0,
            learningProgress: 0
        };
        
        if (this.rsuAgents.size === 0) return stats;
        
        let totalLoad = 0;
        let totalMessages = 0;
        let totalResponseTime = 0;
        let totalCooperation = 0;
        let totalLearning = 0;
        
        for (const agent of this.rsuAgents.values()) {
            // Use getStats() instead of getPerformanceStats() since that's the actual method name
            const agentStats = agent.getStats();
            
            // Map the actual stats structure from RSUAgent.getStats()
            totalLoad += agentStats.currentLoad || 0;
            totalMessages += agentStats.actionHistoryLength || 0; // Use actionHistoryLength as proxy for messages processed
            totalResponseTime += 0; // RSUAgent doesn't track response time, so default to 0
            totalCooperation += 0; // RSUAgent doesn't track cooperation events in getStats, so default to 0
            totalLearning += agentStats.totalReward || 0; // Use totalReward as learning progress indicator
        }
        
        stats.averageLoad = totalLoad / this.rsuAgents.size;
        stats.totalMessagesProcessed = totalMessages;
        stats.averageResponseTime = totalResponseTime / this.rsuAgents.size;
        stats.cooperationEvents = totalCooperation;
        stats.learningProgress = totalLearning / this.rsuAgents.size;
        
        return stats;
    }

    updateComprehensiveUI() {
        const stats = this.getComprehensiveStats();
        
        // Update main UI with comprehensive stats
        this.uiManager.updateStats(stats);
        
        // Update vehicle summary
        this.uiManager.updateVehicleSummary(stats.vehicleSummary);
        
        // Update vehicle status display
        this.uiManager.updateVehicleStatus(this.vehicleManager.vehicles);
        
        // Log comprehensive stats
        console.log('🔧 Comprehensive Simulation Stats:', {
            timestamp: new Date().toISOString(),
            totalSent: (stats.networkStats?.packetsSent || 0),
            totalReceived: (stats.networkStats?.packetsReceived || 0),
            totalLost: (stats.networkStats?.packetsLost || 0),
            aiEpsilon: (stats.aiStats?.epsilon || 0).toFixed(3),
            rlTotalReward: (stats.aiStats?.totalReward || 0).toFixed(2),
            rlAverageReward: (stats.aiStats?.averageReward || 0).toFixed(2),
            messageTypeStats: stats.networkStats?.networkStats || {},
            fps: (stats.fps || 0).toFixed(1)
        });
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
            totalVehicles: this.vehicleManager ? this.vehicleManager.vehicles.length : 0
        };
    }

    // Interactive Control Methods
    setTimeScale(scale) {
        this.timeScale = scale;
        console.log(`⚡ Time scale set to ${scale}x`);
    }
    
    setVehicleCount(count) {
        if (this.vehicleManager) {
            console.log(`🚗 Setting vehicle count to ${count}`);
            this.vehicleManager.setVehicleCount(count);
            
            // Update UI immediately
            this.updateComprehensiveUI();
        }
    }
    
    setVehicleSpeed(speed) {
        if (this.vehicleManager) {
            console.log(`🏎️ Setting vehicle speed to ${speed} km/h`);
            this.vehicleManager.setGlobalSpeed(speed);
        }
    }
    
    setSignalStrength(strength) {
        if (this.networkManager) {
            console.log(`📡 Setting signal strength to ${strength}`);
            this.networkManager.setGlobalSignalStrength(strength);
        }
    }
    
    setLearningRate(rate) {
        if (this.networkManager && this.networkManager.ai) {
            console.log(`🧠 Setting AI learning rate to ${rate}`);
            this.networkManager.ai.setLearningRate(rate);
        }
    }
    
    reset() {
        console.log('🔄 Resetting simulation...');
        this.stop();
        
        // Reset all managers
        if (this.vehicleManager) {
            this.vehicleManager.resetVehicles();
        }
        if (this.networkManager) {
            this.networkManager.reset();
        }
        if (this.plotManager) {
            this.plotManager.reset();
        }
        
        // Reinitialize vehicles
        if (this.vehicleManager) {
            this.vehicleManager.initializeVehicles();
        }
        
        console.log('✅ Simulation reset complete');
    }
    
    // Performance metrics for interactive controls
    getNetworkEfficiency() {
        if (!this.networkManager) return 0;
        const stats = this.networkManager.getStats();
        const total = stats.packetsSent;
        const received = stats.packetsReceived;
        return total > 0 ? Math.round((received / total) * 100) : 0;
    }
    
    getAIConfidence() {
        if (!this.networkManager || !this.networkManager.ai) return 0;
        const aiStats = this.networkManager.ai.getStats();
        // Convert epsilon (exploration) to confidence (exploitation)
        return Math.round((1 - aiStats.epsilon) * 100);
    }

    setupUICallbacks() {
        // Connect UI buttons to simulation control methods
        this.uiManager.setStartCallback(() => this.start());
        this.uiManager.setStopCallback(() => this.stop());
        console.log('🎮 UI callbacks connected to simulation controls');
    }
    
    start() {
        console.log('🚀 Starting Enhanced V2X Simulation...');
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        
        // Update UI state
        this.uiManager.setSimulationRunning(true);
        
        // Start the main update loop
        this.update();
        
        console.log('✅ Simulation started successfully');
    }
    
    stop() {
        console.log('🛑 Stopping Enhanced V2X Simulation...');
        this.isRunning = false;
        this.isPaused = false;
        
        // Update UI state
        this.uiManager.setSimulationRunning(false);
        
        console.log('✅ Simulation stopped successfully');
    }
    
    pause() {
        console.log('⏸️ Pausing simulation...');
        this.isPaused = true;
    }
    
    resume() {
        console.log('▶️ Resuming simulation...');
        this.isPaused = false;
        this.lastTime = performance.now(); // Reset timing to avoid large delta
    }
} 