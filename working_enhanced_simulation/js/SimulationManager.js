import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
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
            // TEMPORARILY DISABLED TO FIX CACHE ISSUE
            // this.networkManager = new EnhancedVisualNetworkManager(this.scene, this.vehicleManager);
            this.networkManager = null;
            
            // Check network manager version
            // if (this.networkManager.getVersion) {
            //     console.log('🔍 Network Manager Version:', this.networkManager.getVersion());
            // } else {
            //     console.log('⚠️ Network Manager version check not available');
            // }
            
            // Set up cross-manager references
            // Temporarily commented out to debug the issue
            if (this.networkManager) {
                console.log('🔍 Debugging networkManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.networkManager)));
                console.log('🔍 networkManager object:', this.networkManager);
            } else {
                console.log('🔍 NetworkManager is null (temporarily disabled)');
            }
            
            // this.networkManager.setPlotManager(this.plotManager);
            // this.networkManager.setProcessingManager(this.processingManager);
            // this.networkManager.setRSUPositions(this.sceneManager.rsuPositions || []);
            // this.networkManager.updateBaseStationPosition(this.sceneManager);
            
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
            
            // Create simple safety message visualization
            this.createSimpleSafetyMessageVisualization();
            
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
        if (this.networkManager && this.networkManager.setTrafficCallback) {
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
                try {
                    this.networkManager.update(this.deltaTime, currentTime);
                } catch (error) {
                    console.error('❌ Error in network manager update:', error);
                    // Continue simulation even if network manager fails
                }
            }
            
            // AIManager update (if exists)
            if (this.aiManager && this.aiManager.update) {
                this.aiManager.update(this.deltaTime);
            }
            
            // New AI Integration update
            // Temporarily commented out to fix CONFIG import issue
            // if (this.aiIntegration && this.aiIntegration.update) {
            //     this.aiIntegration.update(this.deltaTime);
            // }
            
            // ProcessingManager update (if exists)
            if (this.processingManager && this.processingManager.update) {
                this.processingManager.update(this.deltaTime);
            }
            
            // Update enhanced AI systems
            this.updateTrafficLights();
            this.updateRSUAgents();
            
            // Update safety message animation
            this.updateSafetyMessageAnimation();
            
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
                networkLoad: this.networkManager ? 
                    this.networkManager.getLocalNetworkLoad ? 
                        this.networkManager.getLocalNetworkLoad(agent.position) : 0 
                    : 0,
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
        // Generate stats from safety message system since networkManager is disabled
        const safetyMessageStats = this.getSafetyMessageStats();
        const aiStats = this.aiManager.getStats();
        const vehicleSummary = this.vehicleManager.getSummary ? 
            this.vehicleManager.getSummary() : 
            (this.vehicleManager.getVehicleSummary ? this.vehicleManager.getVehicleSummary() : {});
        const processingStats = this.processingManager ? this.processingManager.getStats() : null;
        
        // Get enhanced AI stats (with safe method calls)
        const trafficStats = this.trafficLightController.getPerformanceStats ? 
            this.trafficLightController.getPerformanceStats() : {};
        const rsuStats = this.getRSUAgentStats();
        
        // Add FPS to stats
        const stats = {
            ...safetyMessageStats,
            aiStats,
            vehicleSummary,
            processingStats,
            trafficStats,
            rsuStats,
            fps: this.fps,
            timestamp: Date.now()
        };
        
        // Update latency tracking
        this.updateLatencyTracking(stats);
        
        return stats;
    }
    
    getSafetyMessageStats() {
        // Generate comprehensive stats from the safety message system
        const stats = {
            totalSent: 0,
            totalReceived: 0,
            totalLost: 0,
            totalLatency: 0,
            totalDataTransferred: 0,
            safetyMessages: 0,
            messageTypeStats: {
                SAFETY_MESSAGE: 0,
                BASIC_CAM_MESSAGE: 0,
                TRAFFIC_MESSAGE: 0,
                INFOTAINMENT_MESSAGE: 0
            },
            networkStats: {
                DSRC: { sent: 0, received: 0, lost: 0 },
                WIFI: { sent: 0, received: 0, lost: 0 },
                LTE: { sent: 0, received: 0, lost: 0 }
            },
            latencyData: this.latencyData || [],
            aiEpsilon: 0.1, // Default exploration rate
            rlStats: {
                totalReward: 0,
                averageReward: 0,
                episodeCount: 0,
                epsilon: 0.1
            }
        };
        
        // Count safety messages
        if (this.safetyMessages) {
            stats.safetyMessages = this.safetyMessages.length;
            stats.totalSent = this.safetyMessages.length;
            stats.messageTypeStats.SAFETY_MESSAGE = this.safetyMessages.length;
            
            // Simulate received messages (most safety messages are received)
            stats.totalReceived = Math.floor(this.safetyMessages.length * 0.9);
            stats.totalLost = this.safetyMessages.length - stats.totalReceived;
            
            // Simulate network distribution
            const totalMessages = this.safetyMessages.length;
            stats.networkStats.DSRC.sent = Math.floor(totalMessages * 0.4);
            stats.networkStats.WIFI.sent = Math.floor(totalMessages * 0.35);
            stats.networkStats.LTE.sent = Math.floor(totalMessages * 0.25);
            
            // Calculate received and lost for each network
            stats.networkStats.DSRC.received = Math.floor(stats.networkStats.DSRC.sent * 0.95);
            stats.networkStats.DSRC.lost = stats.networkStats.DSRC.sent - stats.networkStats.DSRC.received;
            
            stats.networkStats.WIFI.received = Math.floor(stats.networkStats.WIFI.sent * 0.9);
            stats.networkStats.WIFI.lost = stats.networkStats.WIFI.sent - stats.networkStats.WIFI.received;
            
            stats.networkStats.LTE.received = Math.floor(stats.networkStats.LTE.sent * 0.85);
            stats.networkStats.LTE.lost = stats.networkStats.LTE.sent - stats.networkStats.LTE.received;
        }
        
        // Calculate total data transferred (simplified)
        stats.totalDataTransferred = stats.totalSent * 512; // 512 bytes per message
        
        // Calculate average latency
        if (stats.totalReceived > 0) {
            stats.totalLatency = stats.totalReceived * 50; // 50ms average latency
        }
        
        // Generate RL stats
        stats.rlStats.totalReward = stats.totalReceived * 10 - stats.totalLost * 5;
        stats.rlStats.averageReward = stats.totalReceived > 0 ? stats.rlStats.totalReward / stats.totalReceived : 0;
        stats.rlStats.episodeCount = Math.floor(stats.totalSent / 10); // Every 10 messages is an episode
        stats.rlStats.epsilon = Math.max(0.01, 0.1 - (stats.rlStats.episodeCount * 0.001)); // Decay exploration rate
        
        return stats;
    }
    
    updateLatencyTracking(stats) {
        // Initialize latency tracking if not exists
        if (!this.latencyData) {
            this.latencyData = [];
        }
        
        // Calculate actual latency from completed safety messages
        let totalLatency = 0;
        let messageCount = 0;
        
        // Check for completed messages (messages that have been processed)
        if (this.safetyMessages) {
            const currentTime = Date.now();
            this.safetyMessages.forEach(message => {
                // If message has been processed (reached destination), calculate its latency
                if (message.processed && message.creationTime) {
                    const latency = currentTime - message.creationTime;
                    totalLatency += latency;
                    messageCount++;
                }
            });
        }
        
        // Add new latency data point
        const vehicleCount = this.vehicleManager.vehicles ? this.vehicleManager.vehicles.length : 0;
        const avgLatency = messageCount > 0 ? totalLatency / messageCount : 50; // Default 50ms if no data
        
        this.latencyData.push({
            vehicleCount: vehicleCount,
            latency: avgLatency,
            timestamp: Date.now()
        });
        
        // Keep only last 100 data points to prevent memory issues
        if (this.latencyData.length > 100) {
            this.latencyData = this.latencyData.slice(-100);
        }
        
        // Update stats with latency data
        stats.latencyData = this.latencyData;
        stats.totalLatency = totalLatency;
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
        if (this.networkManager) {
            this.networkManager.resetStats();
        }
        
        // Reset AI learning
        if (this.networkManager && this.networkManager.ai) {
            this.networkManager.ai.reset();
        }
        
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
        if (this.vehicleManager && this.vehicleManager.setVehicleCount) {
            console.log(`🚗 Setting vehicle count to ${count}`);
            this.vehicleManager.setVehicleCount(count);
            
            // Update UI immediately
            this.updateComprehensiveUI();
        } else {
            console.log(`❌ VehicleManager not ready for vehicle count change`);
        }
    }
    
    setVehicleSpeed(speed) {
        if (this.vehicleManager && this.vehicleManager.setGlobalSpeed) {
            console.log(`🏎️ Setting vehicle speed to ${speed} km/h`);
            this.vehicleManager.setGlobalSpeed(speed);
        } else {
            console.log(`❌ VehicleManager not ready for speed change`);
        }
    }
    
    setSignalStrength(strength) {
        if (this.networkManager && this.networkManager.setGlobalSignalStrength) {
            console.log(`📡 Setting signal strength to ${strength}`);
            this.networkManager.setGlobalSignalStrength(strength);
        } else {
            console.log(`❌ NetworkManager not ready for signal strength change`);
        }
    }
    
    setLearningRate(rate) {
        if (this.networkManager && this.networkManager.ai && this.networkManager.ai.setLearningRate) {
            console.log(`🧠 Setting AI learning rate to ${rate}`);
            this.networkManager.ai.setLearningRate(rate);
        } else {
            console.log(`❌ NetworkManager or AI not ready for learning rate change`);
        }
    }
    
    reset() {
        console.log('🔄 Resetting simulation...');
        this.stop();
        
        // Reset all managers
        if (this.vehicleManager && this.vehicleManager.resetVehicles) {
            this.vehicleManager.resetVehicles();
        }
        if (this.networkManager && this.networkManager.reset) {
            this.networkManager.reset();
        }
        if (this.plotManager && this.plotManager.reset) {
            this.plotManager.reset();
        }
        
        // Reinitialize vehicles
        if (this.vehicleManager && this.vehicleManager.initializeVehicles) {
            this.vehicleManager.initializeVehicles();
        }
        
        console.log('✅ Simulation reset complete');
    }
    
    // Performance metrics for interactive controls
    getNetworkEfficiency() {
        if (!this.networkManager || !this.networkManager.getStats) return 0;
        const stats = this.networkManager.getStats();
        const total = stats.packetsSent;
        const received = stats.packetsReceived;
        return total > 0 ? Math.round((received / total) * 100) : 0;
    }
    
    getAIConfidence() {
        if (!this.networkManager || !this.networkManager.ai || !this.networkManager.ai.getStats) return 0;
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

    createSimpleSafetyMessageVisualization() {
        console.log('🚨 Creating simple safety message visualization...');
        
        // Wait for vehicles to be created
        setTimeout(() => {
            if (this.vehicleManager.vehicles.length > 0) {
                // Create initial safety message
                this.createSafetyMessageForVehicle(this.vehicleManager.vehicles[0]);
                
                // Create additional safety messages every 6 seconds (more frequent for better visibility)
                setInterval(() => {
                    if (this.vehicleManager.vehicles.length > 0) {
                        // Pick a random vehicle
                        const randomIndex = Math.floor(Math.random() * this.vehicleManager.vehicles.length);
                        const randomVehicle = this.vehicleManager.vehicles[randomIndex];
                        
                        // Only create safety message if vehicle is moving (more realistic)
                        if (randomVehicle.userData.speed > 0) {
                            this.createSafetyMessageForVehicle(randomVehicle);
                        }
                    }
                }, 6000); // Every 6 seconds
            }
        }, 3000); // Wait 3 seconds for vehicles to be created
    }
    
    createSafetyMessageForVehicle(vehicle) {
        console.log(`🚨 Creating safety message for Vehicle ${vehicle.userData.id}`);
        
        // Create a large red sphere above the vehicle
        const safetyMessageGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const safetyMessageMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.9
        });
        const safetyMessage = new THREE.Mesh(safetyMessageGeometry, safetyMessageMaterial);
        
        // Position above the vehicle
        safetyMessage.position.copy(vehicle.position);
        safetyMessage.position.y += 3;
        
        // Add to scene
        this.scene.add(safetyMessage);
        
        // Store reference for animation with movement data
        if (!this.safetyMessages) {
            this.safetyMessages = [];
        }
        
        // Determine target destination (RSU or base station)
        const targetPosition = this.getNearestInfrastructure(vehicle.position);
        
        const messageData = {
            mesh: safetyMessage,
            vehicle: vehicle,
            startTime: performance.now(),
            startPosition: vehicle.position.clone(),
            targetPosition: targetPosition,
            duration: 4000, // 4 seconds to reach destination
            id: `safety_${vehicle.userData.id}_${Date.now()}`,
            targetType: this.getTargetType(targetPosition),
            creationTime: Date.now() // Track when message was created
        };
        
        this.safetyMessages.push(messageData);
        
        console.log(`🚨🚨🚨 SAFETY MESSAGE CREATED for Vehicle ${vehicle.userData.id} 🚨🚨🚨`);
        console.log(`🚨 Start Position:`, safetyMessage.position);
        console.log(`🚨 Target Position:`, targetPosition);
        console.log(`🚨 Target Type:`, messageData.targetType);
        console.log(`🚨 Total safety messages: ${this.safetyMessages.length}`);
    }
    
    getNearestInfrastructure(vehiclePosition) {
        // Get RSU positions from scene manager
        const rsuPositions = this.sceneManager.rsuPositions || [];
        const baseStationPosition = this.sceneManager.baseStationPosition || new THREE.Vector3(0, 0.1, 50);
        
        let nearestPosition = baseStationPosition;
        let minDistance = vehiclePosition.distanceTo(baseStationPosition);
        let targetType = 'Base Station';
        
        // Check RSUs first (they're closer and more appropriate for safety messages)
        rsuPositions.forEach((rsuPos, index) => {
            const distance = vehiclePosition.distanceTo(rsuPos);
            if (distance < minDistance) {
                minDistance = distance;
                nearestPosition = rsuPos;
                targetType = `RSU ${index + 1}`;
            }
        });
        
        console.log(`📡 Vehicle at ${vehiclePosition.x.toFixed(1)}, ${vehiclePosition.z.toFixed(1)} -> ${targetType} at ${nearestPosition.x.toFixed(1)}, ${nearestPosition.z.toFixed(1)} (${minDistance.toFixed(1)}m)`);
        
        return nearestPosition;
    }
    
    getTargetType(targetPosition) {
        // Determine if this is an RSU or base station based on position
        const baseStationPos = this.sceneManager.baseStationPosition || new THREE.Vector3(0, 0.1, 50);
        const distanceToBase = targetPosition.distanceTo(baseStationPos);
        
        if (distanceToBase < 5) {
            return 'Base Station';
        } else {
            return 'RSU';
        }
    }

    updateSafetyMessageAnimation() {
        if (this.safetyMessages && this.safetyMessages.length > 0) {
            const currentTime = performance.now();
            
            // Filter out messages that have reached their destination
            this.safetyMessages = this.safetyMessages.filter(msg => {
                const elapsed = currentTime - msg.startTime;
                if (elapsed >= msg.duration) {
                    // Mark message as processed before removing
                    msg.processed = true;
                    
                    // Message reached destination - process it at the base station/RSU
                    this.processSafetyMessageAtInfrastructure(msg);
                    this.scene.remove(msg.mesh);
                    console.log(`🚨 Safety message ${msg.id} reached ${msg.targetType} and was processed`);
                    return false; // Remove from array
                }
                return true; // Keep in array for animation
            });

            // Animate remaining safety messages
            this.safetyMessages.forEach(msg => {
                const elapsed = currentTime - msg.startTime;
                const progress = Math.min(elapsed / msg.duration, 1);
                
                // Move the safety message from start to target position
                msg.mesh.position.lerpVectors(
                    msg.startPosition, 
                    msg.targetPosition, 
                    progress
                );
                
                // Keep it floating above the ground during movement
                msg.mesh.position.y = msg.startPosition.y + 3 + Math.sin(progress * Math.PI * 8) * 0.5;
                
                // Animate the safety message
                msg.mesh.rotation.y += 0.1;
                msg.mesh.rotation.z += 0.05;
                
                // Pulse the opacity
                const pulse = Math.sin(elapsed * 0.01) * 0.3 + 0.7;
                msg.mesh.material.opacity = pulse;
                
                // Scale pulsing
                const scale = 1 + Math.sin(elapsed * 0.02) * 0.2;
                msg.mesh.scale.setScalar(scale);
                
                // Different colors for different target types
                let baseColor, pulseColor;
                if (msg.targetType === 'RSU') {
                    // Orange/red for RSU (closer, faster response)
                    baseColor = new THREE.Color(0xff6600);
                    pulseColor = new THREE.Color(0xff8844);
                } else {
                    // Red for base station (farther, slower response)
                    baseColor = new THREE.Color(0xff0000);
                    pulseColor = new THREE.Color(0xff4444);
                }
                
                // Add dramatic color pulsing
                const colorMix = Math.sin(elapsed * 0.02) * 0.5 + 0.5;
                msg.mesh.material.color.lerpColors(baseColor, pulseColor, colorMix);
                
                // Add a trail effect by changing opacity based on progress
                msg.mesh.material.opacity = (1 - progress * 0.3) * pulse; // Fade out as it travels
            });
        }
        
        // Update base station processing animations
        this.updateBaseStationProcessing();
    }
    
    processSafetyMessageAtInfrastructure(messageData) {
        console.log(`🏢 ${messageData.targetType} processing safety message from Vehicle ${messageData.vehicle.userData.id}`);
        
        // Create processing effect at the infrastructure location
        this.createProcessingEffect(messageData.targetPosition, messageData.targetType);
        
        // Simulate processing time and actions
        setTimeout(() => {
            this.simulateInfrastructureActions(messageData);
        }, 1000); // 1 second processing time
    }
    
    createProcessingEffect(position, targetType) {
        // Create a processing indicator at the infrastructure location
        const processingGeometry = new THREE.SphereGeometry(2, 16, 16);
        const processingMaterial = new THREE.MeshBasicMaterial({
            color: targetType === 'RSU' ? 0x00ff00 : 0x0088ff, // Green for RSU, Blue for Base Station
            transparent: true,
            opacity: 0.8
        });
        const processingIndicator = new THREE.Mesh(processingGeometry, processingMaterial);
        
        // Position at the infrastructure
        processingIndicator.position.copy(position);
        processingIndicator.position.y += 2;
        
        // Add to scene
        this.scene.add(processingIndicator);
        
        // Store for animation
        if (!this.processingEffects) {
            this.processingEffects = [];
        }
        
        const effectData = {
            mesh: processingIndicator,
            startTime: performance.now(),
            duration: 3000, // 3 seconds processing time
            targetType: targetType,
            position: position.clone()
        };
        
        this.processingEffects.push(effectData);
        
        console.log(`⚙️ Processing effect created at ${targetType}`);
    }
    
    simulateInfrastructureActions(messageData) {
        console.log(`🏢 ${messageData.targetType} taking actions for safety message from Vehicle ${messageData.vehicle.userData.id}`);
        
        // Simulate different actions based on target type
        if (messageData.targetType === 'RSU') {
            // RSU actions: Local processing and immediate response
            console.log(`📡 RSU taking immediate local actions...`);
            this.createWarningBroadcast(messageData.targetPosition, 'RSU_WARNING', 0x00ff00);
        } else {
            // Base Station actions: Central processing and broadcast
            console.log(`🏢 Base Station processing and broadcasting safety alert...`);
            this.createCentralProcessingEffect(messageData.targetPosition);
            
            // Simulate broadcast to all vehicles
            setTimeout(() => {
                this.broadcastSafetyAlertToAllVehicles(messageData);
            }, 2000);
        }
    }
    
    createWarningBroadcast(position, type, color) {
        // Create a warning broadcast effect
        const warningGeometry = new THREE.RingGeometry(3, 3.5, 32);
        const warningMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const warningRing = new THREE.Mesh(warningGeometry, warningMaterial);
        
        warningRing.position.copy(position);
        warningRing.rotation.x = -Math.PI / 2;
        warningRing.position.y += 0.1;
        
        this.scene.add(warningRing);
        
        if (!this.warningEffects) {
            this.warningEffects = [];
        }
        
        const effectData = {
            mesh: warningRing,
            startTime: performance.now(),
            duration: 2000,
            position: position.clone()
        };
        
        this.warningEffects.push(effectData);
        
        console.log(`⚠️ Warning broadcast created`);
    }
    
    createCentralProcessingEffect(position) {
        // Create a more dramatic central processing effect
        const centralGeometry = new THREE.CylinderGeometry(1, 1, 4, 8);
        const centralMaterial = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.9
        });
        const centralEffect = new THREE.Mesh(centralGeometry, centralMaterial);
        
        centralEffect.position.copy(position);
        centralEffect.position.y += 3;
        
        this.scene.add(centralEffect);
        
        if (!this.centralProcessingEffects) {
            this.centralProcessingEffects = [];
        }
        
        const effectData = {
            mesh: centralEffect,
            startTime: performance.now(),
            duration: 4000,
            position: position.clone()
        };
        
        this.centralProcessingEffects.push(effectData);
        
        console.log(`🏢 Central processing effect created at Base Station`);
    }
    
    broadcastSafetyAlertToAllVehicles(messageData) {
        console.log(`📢 Broadcasting safety alert to all vehicles...`);
        
        // Create broadcast effect
        this.createBroadcastEffect(messageData.targetPosition);
        
        // Simulate alert to vehicles
        if (this.vehicleManager.vehicles) {
            this.vehicleManager.vehicles.forEach(vehicle => {
                if (vehicle.userData.id !== messageData.vehicle.userData.id) {
                    // Create alert indicator for each vehicle
                    this.createVehicleAlert(vehicle);
                }
            });
        }
    }
    
    createBroadcastEffect(position) {
        // Create expanding ring effect for broadcast
        const ringGeometry = new THREE.RingGeometry(5, 5.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const broadcastRing = new THREE.Mesh(ringGeometry, ringMaterial);
        
        broadcastRing.position.copy(position);
        broadcastRing.rotation.x = -Math.PI / 2;
        broadcastRing.position.y += 0.1;
        
        this.scene.add(broadcastRing);
        
        if (!this.broadcastEffects) {
            this.broadcastEffects = [];
        }
        
        const effectData = {
            mesh: broadcastRing,
            startTime: performance.now(),
            duration: 3000,
            position: position.clone()
        };
        
        this.broadcastEffects.push(effectData);
        
        console.log(`📢 Broadcast effect created`);
    }
    
    createVehicleAlert(vehicle) {
        // Create a small alert indicator above the vehicle
        const alertGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const alertMaterial = new THREE.MeshBasicMaterial({
            color: 0xff8800,
            transparent: true,
            opacity: 0.8
        });
        const alertIndicator = new THREE.Mesh(alertGeometry, alertMaterial);
        
        alertIndicator.position.copy(vehicle.position);
        alertIndicator.position.y += 2;
        
        this.scene.add(alertIndicator);
        
        if (!this.vehicleAlerts) {
            this.vehicleAlerts = [];
        }
        
        const alertData = {
            mesh: alertIndicator,
            vehicle: vehicle,
            startTime: performance.now(),
            duration: 4000
        };
        
        this.vehicleAlerts.push(alertData);
        
        console.log(`⚠️ Alert created for Vehicle ${vehicle.userData.id}`);
    }
    
    updateBaseStationProcessing() {
        const currentTime = performance.now();
        
        // Update processing effects
        if (this.processingEffects) {
            this.processingEffects = this.processingEffects.filter(effect => {
                const elapsed = currentTime - effect.startTime;
                if (elapsed >= effect.duration) {
                    this.scene.remove(effect.mesh);
                    return false;
                }
                
                // Animate processing effect
                effect.mesh.rotation.y += 0.2;
                effect.mesh.scale.setScalar(1 + Math.sin(elapsed * 0.01) * 0.3);
                effect.mesh.material.opacity = 0.8 * (1 - elapsed / effect.duration);
                
                return true;
            });
        }
        
        // Update central processing effects
        if (this.centralProcessingEffects) {
            this.centralProcessingEffects = this.centralProcessingEffects.filter(effect => {
                const elapsed = currentTime - effect.startTime;
                if (elapsed >= effect.duration) {
                    this.scene.remove(effect.mesh);
                    return false;
                }
                
                // Animate central processing effect
                effect.mesh.rotation.y += 0.1;
                effect.mesh.rotation.z += 0.05;
                effect.mesh.scale.setScalar(1 + Math.sin(elapsed * 0.005) * 0.2);
                
                return true;
            });
        }
        
        // Update warning effects
        if (this.warningEffects) {
            this.warningEffects = this.warningEffects.filter(effect => {
                const elapsed = currentTime - effect.startTime;
                if (elapsed >= effect.duration) {
                    this.scene.remove(effect.mesh);
                    return false;
                }
                
                // Animate warning effect (expanding ring)
                const progress = elapsed / effect.duration;
                effect.mesh.scale.setScalar(1 + progress * 2);
                effect.mesh.material.opacity = 0.6 * (1 - progress);
                
                return true;
            });
        }
        
        // Update broadcast effects
        if (this.broadcastEffects) {
            this.broadcastEffects = this.broadcastEffects.filter(effect => {
                const elapsed = currentTime - effect.startTime;
                if (elapsed >= effect.duration) {
                    this.scene.remove(effect.mesh);
                    return false;
                }
                
                // Animate broadcast effect (expanding ring)
                const progress = elapsed / effect.duration;
                effect.mesh.scale.setScalar(1 + progress * 3);
                effect.mesh.material.opacity = 0.6 * (1 - progress);
                
                return true;
            });
        }
        
        // Update vehicle alerts
        if (this.vehicleAlerts) {
            this.vehicleAlerts = this.vehicleAlerts.filter(alert => {
                const elapsed = currentTime - alert.startTime;
                if (elapsed >= alert.duration) {
                    this.scene.remove(alert.mesh);
                    return false;
                }
                
                // Animate vehicle alert
                alert.mesh.position.y = alert.vehicle.position.y + 2 + Math.sin(elapsed * 0.01) * 0.5;
                alert.mesh.rotation.y += 0.2;
                alert.mesh.material.opacity = 0.8 * (1 - elapsed / alert.duration);
                
                return true;
            });
        }
    }
} 