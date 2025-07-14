/**
 * AIIntegration - Simple integration for new AI components
 * Connects CloudAssessmentAI and MessageRouterAI to the main system
 */

import { CloudAssessmentAI } from './CloudAssessmentAI.js';
import { MessageRouterAI } from './MessageRouterAI.js';

export class AIIntegration {
    constructor() {
        console.log('🔗 AIIntegration: Initializing AI component integration...');
        
        // Initialize new AI components
        this.cloudAssessment = new CloudAssessmentAI();
        this.messageRouter = new MessageRouterAI();
        
        // Integration status
        this.isIntegrated = false;
        this.integrationTargets = {
            networkManager: null,
            vehicleManager: null,
            sceneManager: null
        };
        
        console.log('✅ AIIntegration initialized with CloudAssessmentAI and MessageRouterAI');
    }
    
    /**
     * Integrate with main simulation components
     */
    integrate(networkManager, vehicleManager, sceneManager) {
        console.log('🔗 AIIntegration: Connecting to simulation components...');
        
        this.integrationTargets.networkManager = networkManager;
        this.integrationTargets.vehicleManager = vehicleManager;
        this.integrationTargets.sceneManager = sceneManager;
        
        this.isIntegrated = true;
        
        console.log('✅ AIIntegration: Successfully connected to simulation components');
    }
    
    /**
     * Update all AI components
     */
    update(deltaTime) {
        if (!this.isIntegrated) return;
        
        try {
            // Update cloud assessment with current data
            this.updateCloudAssessment();
            
            // Update message routing statistics
            this.updateMessageRouting();
            
        } catch (error) {
            console.error('❌ AIIntegration update error:', error);
        }
    }
    
    /**
     * Update cloud assessment with current simulation data
     */
    updateCloudAssessment() {
        if (!this.integrationTargets.networkManager || !this.integrationTargets.vehicleManager) return;
        
        const networkManager = this.integrationTargets.networkManager;
        const vehicleManager = this.integrationTargets.vehicleManager;
        
        // Update network assessments
        Object.keys(CONFIG.NETWORK.TYPES).forEach(networkType => {
            const networkStats = networkManager.stats.networkStats[networkType];
            if (networkStats) {
                this.cloudAssessment.updateNetworkAssessment(networkType, {
                    totalPackets: networkStats.sent + networkStats.received + networkStats.lost,
                    successfulPackets: networkStats.received,
                    failedPackets: networkStats.lost,
                    averageLatency: networkManager.stats.totalLatency / (networkManager.stats.packetsReceived || 1)
                });
            }
        });
        
        // Update vehicle assessments
        if (vehicleManager.vehicles) {
            vehicleManager.vehicles.forEach(vehicle => {
                if (vehicle && vehicle.userData) {
                    this.cloudAssessment.updateVehicleAssessment(vehicle.userData.id, {
                        totalMessages: vehicle.userData.totalMessages || 0,
                        messageTypes: vehicle.userData.messageTypes || {},
                        averageLatency: vehicle.userData.averageLatency || 0,
                        sent: vehicle.userData.packetsSent || 0,
                        received: vehicle.userData.packetsReceived || 0
                    });
                }
            });
        }
    }
    
    /**
     * Update message routing statistics
     */
    updateMessageRouting() {
        if (!this.integrationTargets.vehicleManager) return;
        
        const vehicleManager = this.integrationTargets.vehicleManager;
        
        // Update message routing for each vehicle
        if (vehicleManager.vehicles) {
            vehicleManager.vehicles.forEach(vehicle => {
                if (vehicle && vehicle.userData && vehicle.userData.currentMessageType) {
                    const routingInfo = this.messageRouter.routeMessage(
                        vehicle, 
                        vehicle.userData.currentMessageType, 
                        vehicle.userData.currentNetwork || 'DSRC'
                    );
                    
                    // Process transmission result
                    if (vehicle.userData.lastTransmissionResult) {
                        this.messageRouter.processTransmissionResult(
                            vehicle,
                            vehicle.userData.currentMessageType,
                            routingInfo,
                            vehicle.userData.lastTransmissionResult.success,
                            vehicle.userData.lastTransmissionResult.latency
                        );
                    }
                }
            });
        }
    }
    
    /**
     * Get comprehensive AI report
     */
    getAIReport() {
        return {
            timestamp: Date.now(),
            cloudAssessment: this.cloudAssessment.getAssessmentReport(),
            messageRouting: this.messageRouter.getRoutingReport(),
            integrationStatus: {
                isIntegrated: this.isIntegrated,
                components: Object.keys(this.integrationTargets).filter(key => this.integrationTargets[key] !== null)
            }
        };
    }
    
    /**
     * Get message type visibility
     */
    getMessageTypeVisibility() {
        return this.messageRouter.getMessageTypeVisibility();
    }
    
    /**
     * Get emergency message statistics
     */
    getEmergencyMessageStats() {
        return this.messageRouter.getEmergencyMessageStats();
    }
    
    /**
     * Get cloud assessment alerts
     */
    getCloudAssessmentAlerts() {
        return this.cloudAssessment.getAllAlerts();
    }
    
    /**
     * Reset all AI components
     */
    reset() {
        console.log('🔄 AIIntegration: Resetting all AI components...');
        
        this.cloudAssessment.reset();
        this.messageRouter.reset();
        
        this.isIntegrated = false;
        this.integrationTargets = {
            networkManager: null,
            vehicleManager: null,
            sceneManager: null
        };
        
        console.log('✅ AIIntegration: All components reset');
    }
} 