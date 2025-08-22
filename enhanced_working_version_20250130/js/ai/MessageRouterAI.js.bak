/**
 * MessageRouterAI - Intelligent message routing system
 * Handles V2V vs V2I routing, emergency message escalation, and cloud-based assessment
 */

import { CONFIG } from '../config/config.js';

export class MessageRouterAI {
    constructor() {
        console.log('🔄 MessageRouterAI: Initializing intelligent message routing...');
        
        // Message routing state
        this.routingTable = new Map();
        this.emergencyQueue = [];
        this.v2vConnections = new Map();
        this.v2iConnections = new Map();
        
        // Cloud-based assessment data
        this.cloudAssessment = {
            rsuPerformance: new Map(),
            roadConditions: new Map(),
            vehicleStats: new Map(),
            networkHealth: new Map(),
            emergencyHistory: []
        };
        
        // Per-vehicle packet tracking
        this.vehiclePacketStats = new Map();
        this.sessionStats = {
            totalSessions: 0,
            currentSession: 0,
            crossSessionData: new Map()
        };
        
        // Emergency message handling
        this.emergencyProtocol = {
            escalationPath: ['RSU', 'BASE_STATION', 'BROADCAST'],
            priorityOverride: true,
            immediateProcessing: true,
            broadcastRadius: 200 // meters
        };
        
        // Message type routing rules
        this.routingRules = {
            SAFETY_MESSAGE: {
                primaryRoute: 'V2I_TO_RSU',
                fallbackRoute: 'V2V_DIRECT',
                emergencyEscalation: true,
                cloudAssessment: true
            },
            BASIC_CAM_MESSAGE: {
                primaryRoute: 'V2V_DIRECT',
                fallbackRoute: 'V2I_TO_RSU',
                emergencyEscalation: false,
                cloudAssessment: false
            },
            TRAFFIC_MESSAGE: {
                primaryRoute: 'V2I_TO_RSU',
                fallbackRoute: 'V2V_DIRECT',
                emergencyEscalation: false,
                cloudAssessment: true
            },
            INFOTAINMENT_MESSAGE: {
                primaryRoute: 'V2I_TO_BASE',
                fallbackRoute: 'V2I_TO_RSU',
                emergencyEscalation: false,
                cloudAssessment: false
            }
        };
        
        console.log('✅ MessageRouterAI initialized with routing rules and cloud assessment');
    }
    
    /**
     * Route message based on type, vehicle state, and network conditions
     */
    routeMessage(vehicle, messageType, messageData) {
        const vehicleId = vehicle.userData.id;
        const vehiclePosition = vehicle.position;
        
        // Update vehicle packet statistics
        this.updateVehiclePacketStats(vehicleId, messageType, 'SENT');
        
        // Get routing rule for message type
        const rule = this.routingRules[messageType];
        if (!rule) {
            console.warn(`⚠️ No routing rule for message type: ${messageType}`);
            return this.defaultRoute(vehicle, messageType);
        }
        
        // Check if this is an emergency message
        if (this.isEmergencyMessage(messageData)) {
            return this.handleEmergencyMessage(vehicle, messageType, messageData);
        }
        
        // Determine primary route
        let route = this.determineRoute(vehicle, messageType, rule.primaryRoute);
        
        // If primary route fails, try fallback
        if (!route.success && rule.fallbackRoute) {
            route = this.determineRoute(vehicle, messageType, rule.fallbackRoute);
        }
        
        // Update cloud assessment if required
        if (rule.cloudAssessment) {
            this.updateCloudAssessment(vehicle, messageType, route);
        }
        
        // Log routing decision
        console.log(`🔄 Vehicle ${vehicleId}: ${messageType} routed via ${route.type} to ${route.target}`);
        
        return route;
    }
    
    /**
     * Determine specific route based on routing type
     */
    determineRoute(vehicle, messageType, routeType) {
        const vehiclePosition = vehicle.position;
        
        switch (routeType) {
            case 'V2V_DIRECT':
                return this.findV2VRoute(vehicle, messageType);
                
            case 'V2I_TO_RSU':
                return this.findV2IRoute(vehicle, messageType, 'RSU');
                
            case 'V2I_TO_BASE':
                return this.findV2IRoute(vehicle, messageType, 'BASE_STATION');
                
            default:
                return this.defaultRoute(vehicle, messageType);
        }
    }
    
    /**
     * Find V2V (Vehicle-to-Vehicle) route
     */
    findV2VRoute(vehicle, messageType) {
        const vehiclePosition = vehicle.position;
        const nearbyVehicles = this.findNearbyVehicles(vehiclePosition, 50); // 50m range
        
        if (nearbyVehicles.length > 0) {
            // Find best vehicle for V2V communication
            const bestVehicle = this.selectBestV2VTarget(vehicle, nearbyVehicles, messageType);
            
            return {
                type: 'V2V_DIRECT',
                target: bestVehicle.userData.id,
                targetType: 'VEHICLE',
                distance: vehiclePosition.distanceTo(bestVehicle.position),
                success: true,
                priority: CONFIG.MESSAGE_TYPES[messageType].priority
            };
        }
        
        return { success: false, reason: 'No nearby vehicles for V2V' };
    }
    
    /**
     * Find V2I (Vehicle-to-Infrastructure) route
     */
    findV2IRoute(vehicle, messageType, targetType) {
        const vehiclePosition = vehicle.position;
        let target = null;
        let distance = Infinity;
        
        if (targetType === 'RSU') {
            // Find nearest RSU
            const rsuPositions = this.getRSUPositions();
            for (const rsuPos of rsuPositions) {
                const dist = vehiclePosition.distanceTo(rsuPos);
                if (dist < distance && dist <= 60) { // RSU range
                    distance = dist;
                    target = rsuPos;
                }
            }
        } else if (targetType === 'BASE_STATION') {
            // Route to base station
            const baseStationPos = this.getBaseStationPosition();
            distance = vehiclePosition.distanceTo(baseStationPos);
            if (distance <= 150) { // Base station range
                target = baseStationPos;
            }
        }
        
        if (target) {
            return {
                type: 'V2I',
                target: targetType,
                targetType: targetType,
                distance: distance,
                success: true,
                priority: CONFIG.MESSAGE_TYPES[messageType].priority
            };
        }
        
        return { success: false, reason: `No ${targetType} in range` };
    }
    
    /**
     * Handle emergency messages with escalation protocol
     */
    handleEmergencyMessage(vehicle, messageType, messageData) {
        const vehicleId = vehicle.userData.id;
        const vehiclePosition = vehicle.position;
        
        console.log(`🚨 EMERGENCY: Vehicle ${vehicleId} sending ${messageType}`);
        
        // Create emergency message record
        const emergencyMsg = {
            id: `EMERGENCY_${vehicleId}_${Date.now()}`,
            vehicleId: vehicleId,
            messageType: messageType,
            position: vehiclePosition.clone(),
            timestamp: Date.now(),
            escalationPath: [...this.emergencyProtocol.escalationPath],
            currentStep: 0
        };
        
        // Add to emergency queue
        this.emergencyQueue.push(emergencyMsg);
        
        // Update emergency history
        this.cloudAssessment.emergencyHistory.push({
            vehicleId: vehicleId,
            messageType: messageType,
            timestamp: Date.now(),
            position: vehiclePosition.clone()
        });
        
        // Start escalation process
        return this.escalateEmergencyMessage(emergencyMsg);
    }
    
    /**
     * Escalate emergency message through RSU → Base Station → Broadcast
     */
    escalateEmergencyMessage(emergencyMsg) {
        const currentStep = emergencyMsg.currentStep;
        const escalationPath = emergencyMsg.escalationPath;
        
        if (currentStep >= escalationPath.length) {
            console.log(`✅ Emergency message ${emergencyMsg.id} fully escalated`);
            return { success: true, type: 'EMERGENCY_COMPLETE' };
        }
        
        const currentTarget = escalationPath[currentStep];
        
        switch (currentTarget) {
            case 'RSU':
                return this.routeToRSU(emergencyMsg);
                
            case 'BASE_STATION':
                return this.routeToBaseStation(emergencyMsg);
                
            case 'BROADCAST':
                return this.broadcastEmergency(emergencyMsg);
                
            default:
                return { success: false, reason: 'Unknown escalation target' };
        }
    }
    
    /**
     * Route emergency message to RSU
     */
    routeToRSU(emergencyMsg) {
        const rsuPositions = this.getRSUPositions();
        const nearestRSU = this.findNearestRSU(emergencyMsg.position, rsuPositions);
        
        if (nearestRSU) {
            // Update RSU performance in cloud assessment
            this.updateRSUPerformance(nearestRSU, 'EMERGENCY_PROCESSED');
            
            return {
                type: 'EMERGENCY_TO_RSU',
                target: nearestRSU,
                targetType: 'RSU',
                distance: emergencyMsg.position.distanceTo(nearestRSU),
                success: true,
                priority: 10, // Highest priority
                emergencyId: emergencyMsg.id
            };
        }
        
        return { success: false, reason: 'No RSU available for emergency' };
    }
    
    /**
     * Route emergency message to base station
     */
    routeToBaseStation(emergencyMsg) {
        const baseStationPos = this.getBaseStationPosition();
        const distance = emergencyMsg.position.distanceTo(baseStationPos);
        
        if (distance <= 150) {
            // Update cloud assessment
            this.updateCloudAssessment(null, 'EMERGENCY_MESSAGE', {
                type: 'BASE_STATION_PROCESSING',
                emergencyId: emergencyMsg.id
            });
            
            return {
                type: 'EMERGENCY_TO_BASE',
                target: baseStationPos,
                targetType: 'BASE_STATION',
                distance: distance,
                success: true,
                priority: 10,
                emergencyId: emergencyMsg.id
            };
        }
        
        return { success: false, reason: 'Base station out of range' };
    }
    
    /**
     * Broadcast emergency message to all vehicles
     */
    broadcastEmergency(emergencyMsg) {
        const broadcastRadius = this.emergencyProtocol.broadcastRadius;
        const nearbyVehicles = this.findNearbyVehicles(emergencyMsg.position, broadcastRadius);
        
        console.log(`📡 BROADCASTING emergency to ${nearbyVehicles.length} vehicles`);
        
        return {
            type: 'EMERGENCY_BROADCAST',
            target: 'ALL_VEHICLES',
            targetType: 'BROADCAST',
            distance: broadcastRadius,
            success: true,
            priority: 10,
            emergencyId: emergencyMsg.id,
            affectedVehicles: nearbyVehicles.length
        };
    }
    
    /**
     * Update per-vehicle packet statistics
     */
    updateVehiclePacketStats(vehicleId, messageType, action) {
        if (!this.vehiclePacketStats.has(vehicleId)) {
            this.vehiclePacketStats.set(vehicleId, {
                sent: 0,
                received: 0,
                lost: 0,
                byMessageType: {},
                sessionHistory: []
            });
        }
        
        const stats = this.vehiclePacketStats.get(vehicleId);
        
        if (action === 'SENT') {
            stats.sent++;
            if (!stats.byMessageType[messageType]) {
                stats.byMessageType[messageType] = { sent: 0, received: 0, lost: 0 };
            }
            stats.byMessageType[messageType].sent++;
        } else if (action === 'RECEIVED') {
            stats.received++;
            if (stats.byMessageType[messageType]) {
                stats.byMessageType[messageType].received++;
            }
        } else if (action === 'LOST') {
            stats.lost++;
            if (stats.byMessageType[messageType]) {
                stats.byMessageType[messageType].lost++;
            }
        }
        
        // Add to session history
        stats.sessionHistory.push({
            timestamp: Date.now(),
            messageType: messageType,
            action: action,
            sessionId: this.sessionStats.currentSession
        });
        
        // Keep history manageable
        if (stats.sessionHistory.length > 1000) {
            stats.sessionHistory = stats.sessionHistory.slice(-500);
        }
    }
    
    /**
     * Update cloud-based assessment data
     */
    updateCloudAssessment(vehicle, messageType, routeData) {
        const timestamp = Date.now();
        
        // Update RSU performance
        if (routeData && routeData.targetType === 'RSU') {
            this.updateRSUPerformance(routeData.target, 'MESSAGE_PROCESSED');
        }
        
        // Update vehicle statistics
        if (vehicle) {
            const vehicleId = vehicle.userData.id;
            if (!this.cloudAssessment.vehicleStats.has(vehicleId)) {
                this.cloudAssessment.vehicleStats.set(vehicleId, {
                    totalMessages: 0,
                    messageTypes: {},
                    averageLatency: 0,
                    reliability: 0,
                    lastUpdate: timestamp
                });
            }
            
            const vehicleStats = this.cloudAssessment.vehicleStats.get(vehicleId);
            vehicleStats.totalMessages++;
            vehicleStats.lastUpdate = timestamp;
            
            if (!vehicleStats.messageTypes[messageType]) {
                vehicleStats.messageTypes[messageType] = 0;
            }
            vehicleStats.messageTypes[messageType]++;
        }
        
        // Update network health
        if (routeData && routeData.success) {
            this.updateNetworkHealth(routeData.type, 'SUCCESS');
        } else {
            this.updateNetworkHealth(routeData?.type || 'UNKNOWN', 'FAILURE');
        }
    }
    
    /**
     * Update RSU performance metrics
     */
    updateRSUPerformance(rsuPosition, event) {
        const rsuKey = `${rsuPosition.x.toFixed(1)}_${rsuPosition.z.toFixed(1)}`;
        
        if (!this.cloudAssessment.rsuPerformance.has(rsuKey)) {
            this.cloudAssessment.rsuPerformance.set(rsuKey, {
                totalMessages: 0,
                emergencyMessages: 0,
                averageLatency: 0,
                uptime: 100,
                lastUpdate: Date.now()
            });
        }
        
        const rsuStats = this.cloudAssessment.rsuPerformance.get(rsuKey);
        rsuStats.totalMessages++;
        rsuStats.lastUpdate = Date.now();
        
        if (event === 'EMERGENCY_PROCESSED') {
            rsuStats.emergencyMessages++;
        }
    }
    
    /**
     * Update network health metrics
     */
    updateNetworkHealth(networkType, status) {
        if (!this.cloudAssessment.networkHealth.has(networkType)) {
            this.cloudAssessment.networkHealth.set(networkType, {
                totalAttempts: 0,
                successes: 0,
                failures: 0,
                successRate: 0
            });
        }
        
        const networkStats = this.cloudAssessment.networkHealth.get(networkType);
        networkStats.totalAttempts++;
        
        if (status === 'SUCCESS') {
            networkStats.successes++;
        } else {
            networkStats.failures++;
        }
        
        networkStats.successRate = networkStats.successes / networkStats.totalAttempts;
    }
    
    /**
     * Get comprehensive cloud assessment report
     */
    getCloudAssessmentReport() {
        const report = {
            timestamp: Date.now(),
            rsuPerformance: {},
            vehicleStats: {},
            networkHealth: {},
            emergencySummary: {
                totalEmergencies: this.cloudAssessment.emergencyHistory.length,
                recentEmergencies: this.cloudAssessment.emergencyHistory
                    .filter(e => Date.now() - e.timestamp < 60000) // Last minute
                    .length
            },
            packetStatistics: {
                totalVehicles: this.vehiclePacketStats.size,
                totalPacketsSent: 0,
                totalPacketsReceived: 0,
                totalPacketsLost: 0
            }
        };
        
        // Convert Maps to objects for JSON serialization
        this.cloudAssessment.rsuPerformance.forEach((stats, key) => {
            report.rsuPerformance[key] = stats;
        });
        
        this.cloudAssessment.vehicleStats.forEach((stats, key) => {
            report.vehicleStats[key] = stats;
        });
        
        this.cloudAssessment.networkHealth.forEach((stats, key) => {
            report.networkHealth[key] = stats;
        });
        
        // Calculate packet statistics
        this.vehiclePacketStats.forEach((stats, vehicleId) => {
            report.packetStatistics.totalPacketsSent += stats.sent;
            report.packetStatistics.totalPacketsReceived += stats.received;
            report.packetStatistics.totalPacketsLost += stats.lost;
        });
        
        return report;
    }
    
    /**
     * Get vehicle packet statistics
     */
    getVehiclePacketStats(vehicleId) {
        return this.vehiclePacketStats.get(vehicleId) || null;
    }
    
    /**
     * Get all vehicle packet statistics
     */
    getAllVehiclePacketStats() {
        const stats = {};
        this.vehiclePacketStats.forEach((vehicleStats, vehicleId) => {
            stats[vehicleId] = {
                ...vehicleStats,
                successRate: vehicleStats.sent > 0 ? 
                    (vehicleStats.received / vehicleStats.sent) * 100 : 0
            };
        });
        return stats;
    }
    
    /**
     * Start new session for cross-session tracking
     */
    startNewSession() {
        this.sessionStats.currentSession++;
        this.sessionStats.totalSessions++;
        
        // Store cross-session data
        const sessionData = {
            sessionId: this.sessionStats.currentSession,
            startTime: Date.now(),
            vehicleStats: new Map(this.vehiclePacketStats),
            cloudAssessment: JSON.parse(JSON.stringify(this.cloudAssessment))
        };
        
        this.sessionStats.crossSessionData.set(this.sessionStats.currentSession, sessionData);
        
        console.log(`🔄 Starting session ${this.sessionStats.currentSession}`);
    }
    
    /**
     * Helper methods for finding targets
     */
    findNearbyVehicles(position, radius) {
        // This would be implemented with actual vehicle data
        // For now, return empty array
        return [];
    }
    
    findNearestRSU(position, rsuPositions) {
        if (!rsuPositions || rsuPositions.length === 0) return null;
        
        let nearest = rsuPositions[0];
        let minDistance = position.distanceTo(nearest);
        
        for (const rsuPos of rsuPositions) {
            const distance = position.distanceTo(rsuPos);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = rsuPos;
            }
        }
        
        return nearest;
    }
    
    selectBestV2VTarget(vehicle, nearbyVehicles, messageType) {
        // Simple selection - nearest vehicle
        // Could be enhanced with more sophisticated logic
        return nearbyVehicles[0] || null;
    }
    
    isEmergencyMessage(messageData) {
        // Check if message contains emergency indicators
        return messageData && (
            messageData.emergency || 
            messageData.collision || 
            messageData.hazard ||
            messageData.priority === 'EMERGENCY'
        );
    }
    
    getRSUPositions() {
        // This would be provided by the simulation
        return [];
    }
    
    getBaseStationPosition() {
        // This would be provided by the simulation
        return { x: 0, y: 0, z: 0 };
    }
    
    defaultRoute(vehicle, messageType) {
        return {
            type: 'DEFAULT',
            target: 'BASE_STATION',
            targetType: 'BASE_STATION',
            distance: 0,
            success: true,
            priority: CONFIG.MESSAGE_TYPES[messageType].priority
        };
    }
    
    /**
     * Reset the router
     */
    reset() {
        this.routingTable.clear();
        this.emergencyQueue = [];
        this.v2vConnections.clear();
        this.v2iConnections.clear();
        this.vehiclePacketStats.clear();
        
        this.cloudAssessment.rsuPerformance.clear();
        this.cloudAssessment.vehicleStats.clear();
        this.cloudAssessment.networkHealth.clear();
        this.cloudAssessment.emergencyHistory = [];
        
        console.log('🔄 MessageRouterAI reset');
    }
} 