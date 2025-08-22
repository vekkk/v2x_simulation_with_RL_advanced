/**
 * AIManager - Centralized AI coordination system
 * Manages all AI components including base station AI, RSU agents, and traffic light AI
 */

import { BaseStationAI } from './BaseStationAI.js';

export class AIManager {
    constructor() {
        console.log('🧠 AIManager: Initializing AI coordination system...');
        
        // Initialize base station AI
        this.baseStationAI = new BaseStationAI();
        
        // AI coordination state
        this.isActive = false;
        this.coordinationMode = 'distributed'; // 'centralized' or 'distributed'
        
        // Performance tracking
        this.performanceMetrics = {
            totalDecisions: 0,
            successfulDecisions: 0,
            averageResponseTime: 0,
            coordinationEfficiency: 0
        };
        
        // AI learning parameters
        this.globalLearningRate = 0.1;
        this.adaptiveParameters = {
            networkConditions: 'normal',
            trafficDensity: 'medium',
            emergencyMode: false
        };
        
        console.log('✅ AIManager initialized successfully');
    }
    
    /**
     * Initialize AI systems with simulation components
     */
    initialize(sceneManager, networkManager, vehicleManager) {
        console.log('🔧 AIManager: Initializing with simulation components...');
        
        this.sceneManager = sceneManager;
        this.networkManager = networkManager;
        this.vehicleManager = vehicleManager;
        
        // The BaseStationAI doesn't need explicit initialization
        // It's ready to use after construction
        
        this.isActive = true;
        console.log('✅ AIManager fully initialized and active');
    }
    
    /**
     * Main update loop for AI coordination
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        try {
            // The BaseStationAI doesn't have an update method
            // It's used per-vehicle during message transmission
            
            // Update adaptive parameters based on current conditions
            this.updateAdaptiveParameters();
            
            // Coordinate AI decisions if in centralized mode
            if (this.coordinationMode === 'centralized') {
                this.coordinateAIDecisions();
            }
            
            // Update performance metrics
            this.updatePerformanceMetrics();
            
        } catch (error) {
            console.error('❌ AIManager update error:', error);
        }
    }
    
    /**
     * Update adaptive parameters based on current simulation state
     */
    updateAdaptiveParameters() {
        if (!this.networkManager || !this.vehicleManager) return;
        
        // Assess network conditions
        const networkStats = this.networkManager.getStats();
        const packetLossRate = networkStats.packetsLost / (networkStats.packetsSent || 1);
        
        if (packetLossRate > 0.1) {
            this.adaptiveParameters.networkConditions = 'poor';
        } else if (packetLossRate > 0.05) {
            this.adaptiveParameters.networkConditions = 'fair';
        } else {
            this.adaptiveParameters.networkConditions = 'good';
        }
        
        // Assess traffic density
        const vehicleCount = this.vehicleManager.vehicles ? this.vehicleManager.vehicles.length : 0;
        if (vehicleCount > 15) {
            this.adaptiveParameters.trafficDensity = 'high';
        } else if (vehicleCount > 8) {
            this.adaptiveParameters.trafficDensity = 'medium';
        } else {
            this.adaptiveParameters.trafficDensity = 'low';
        }
    }
    
    /**
     * Coordinate AI decisions across all systems
     */
    coordinateAIDecisions() {
        // This method would coordinate decisions between:
        // - Base station AI for network selection
        // - RSU agents for local processing
        // - Traffic light AI for traffic optimization
        
        // For now, we'll focus on network optimization
        if (this.baseStationAI && this.adaptiveParameters.networkConditions === 'poor') {
            // Adjust learning parameters for poor network conditions
            this.baseStationAI.setLearningRate(this.globalLearningRate * 1.5);
        }
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        // Update coordination efficiency based on network performance
        if (this.networkManager) {
            const stats = this.networkManager.getStats();
            const efficiency = stats.packetsReceived / (stats.packetsSent || 1);
            this.performanceMetrics.coordinationEfficiency = efficiency;
        }
    }
    
    /**
     * Get AI system statistics
     */
    getStats() {
        const baseStats = this.baseStationAI ? this.baseStationAI.getStats() : {};
        
        return {
            ...baseStats,
            aiManager: {
                isActive: this.isActive,
                coordinationMode: this.coordinationMode,
                adaptiveParameters: { ...this.adaptiveParameters },
                performanceMetrics: { ...this.performanceMetrics }
            }
        };
    }
    
    /**
     * Set coordination mode
     */
    setCoordinationMode(mode) {
        if (['centralized', 'distributed'].includes(mode)) {
            this.coordinationMode = mode;
            console.log(`🔄 AIManager: Coordination mode set to ${mode}`);
        }
    }
    
    /**
     * Handle emergency situations
     */
    activateEmergencyMode() {
        this.adaptiveParameters.emergencyMode = true;
        this.coordinationMode = 'centralized'; // Switch to centralized for emergency
        console.log('🚨 AIManager: Emergency mode activated');
    }
    
    /**
     * Deactivate emergency mode
     */
    deactivateEmergencyMode() {
        this.adaptiveParameters.emergencyMode = false;
        this.coordinationMode = 'distributed'; // Return to distributed
        console.log('✅ AIManager: Emergency mode deactivated');
    }
    
    /**
     * Reset AI systems
     */
    reset() {
        console.log('🔄 AIManager: Resetting AI systems...');
        
        if (this.baseStationAI) {
            this.baseStationAI.reset();
        }
        
        // Reset performance metrics
        this.performanceMetrics = {
            totalDecisions: 0,
            successfulDecisions: 0,
            averageResponseTime: 0,
            coordinationEfficiency: 0
        };
        
        // Reset adaptive parameters
        this.adaptiveParameters = {
            networkConditions: 'normal',
            trafficDensity: 'medium',
            emergencyMode: false
        };
        
        console.log('✅ AIManager reset complete');
    }
    
    /**
     * Get current AI coordination status
     */
    getCoordinationStatus() {
        return {
            isActive: this.isActive,
            mode: this.coordinationMode,
            networkConditions: this.adaptiveParameters.networkConditions,
            trafficDensity: this.adaptiveParameters.trafficDensity,
            emergencyMode: this.adaptiveParameters.emergencyMode,
            efficiency: this.performanceMetrics.coordinationEfficiency
        };
    }
} 