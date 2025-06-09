export const CONFIG = {
    ROAD: {
        LENGTH: 200,
        LANE_WIDTH: 4,
        NUM_LANES: 4,
        SHOULDER_WIDTH: 1,
        DASH_LENGTH: 5,
        DASH_GAP: 5
    },
    VEHICLES: {
        NUM_VEHICLES: 6,
        PACKET_SEND_INTERVAL: 500, // ms
        TYPES: {
            CAR: {
                GEOMETRY: { width: 1.8, height: 1.4, length: 4.2 },
                COLOR: 0x3498db, // Modern blue
                SPEED_RANGE: { min: 20, max: 40 },
                MODEL: {
                    bodyColor: 0x3498db,
                    windowColor: 0x2c3e50,
                    wheelColor: 0x2c3e50,
                    headlightColor: 0xffffff
                }
            },
            TRUCK: {
                GEOMETRY: { width: 2.5, height: 3.2, length: 7.5 },
                COLOR: 0xe74c3c, // Modern red
                SPEED_RANGE: { min: 10, max: 30 },
                MODEL: {
                    bodyColor: 0xe74c3c,
                    cabinColor: 0x2c3e50,
                    wheelColor: 0x2c3e50,
                    headlightColor: 0xffffff
                }
            },
            BUS: {
                GEOMETRY: { width: 2.4, height: 3.5, length: 9 },
                COLOR: 0x2ecc71, // Modern green
                SPEED_RANGE: { min: 15, max: 25 },
                MODEL: {
                    bodyColor: 0x2ecc71,
                    windowColor: 0x2c3e50,
                    wheelColor: 0x2c3e50,
                    headlightColor: 0xffffff
                }
            }
        }
    },
    // V2X Message Types based on ETSI ITS and SAE J2735 standards
    MESSAGE_TYPES: {
        SAFETY_MESSAGE: {
            id: 'M1',
            name: 'Safety Message',
            description: 'Emergency brake, collision warning, hazard alerts',
            priority: 1, // Highest priority
            weight: 10.0, // Highest reward weight
            frequency: 100, // ms - very frequent for safety
            size: 256, // bytes
            color: 0xff0000, // Red for safety
            latencyRequirement: 50, // ms - strict latency requirement
            reliabilityRequirement: 0.99 // 99% reliability required
        },
        BASIC_CAM_MESSAGE: {
            id: 'M2', 
            name: 'Basic CAM',
            description: 'Cooperative Awareness Message - position, speed, heading',
            priority: 2,
            weight: 5.0,
            frequency: 1000, // ms - periodic beacon
            size: 512, // bytes
            color: 0x00ff00, // Green for basic info
            latencyRequirement: 100, // ms
            reliabilityRequirement: 0.95 // 95% reliability
        },
        TRAFFIC_MESSAGE: {
            id: 'M3',
            name: 'Traffic Message', 
            description: 'Traffic light status, road conditions, congestion info',
            priority: 3,
            weight: 3.0,
            frequency: 2000, // ms - less frequent
            size: 1024, // bytes
            color: 0xffa500, // Orange for traffic info
            latencyRequirement: 200, // ms
            reliabilityRequirement: 0.90 // 90% reliability
        },
        INFOTAINMENT_MESSAGE: {
            id: 'M4',
            name: 'Infotainment',
            description: 'Media streaming, navigation updates, non-critical data',
            priority: 4,
            weight: 1.0, // Lowest weight
            frequency: 5000, // ms - least frequent
            size: 2048, // bytes - larger payload
            color: 0x0080ff, // Blue for infotainment
            latencyRequirement: 500, // ms - relaxed latency
            reliabilityRequirement: 0.80 // 80% reliability
        }
    },
    NETWORK: {
        TYPES: {
            DSRC: {
                latencyMs: 20,
                packetLossRate: 0.02, // 2%
                range: 40, // meters
                color: 0x4CAF50, // Green
                bandwidth: 27, // Mbps
                preferredMessages: ['SAFETY_MESSAGE', 'BASIC_CAM_MESSAGE'] // Best for low-latency
            },
            WIFI: {
                latencyMs: 50,
                packetLossRate: 0.05, // 5%
                range: 60, // meters
                color: 0x2196F3, // Blue
                bandwidth: 54, // Mbps
                preferredMessages: ['BASIC_CAM_MESSAGE', 'TRAFFIC_MESSAGE'] // Good for medium priority
            },
            LTE: {
                latencyMs: 120,
                packetLossRate: 0.10, // 10%
                range: 150, // meters
                color: 0x9C27B0, // Purple
                bandwidth: 100, // Mbps
                preferredMessages: ['TRAFFIC_MESSAGE', 'INFOTAINMENT_MESSAGE'] // Best for high bandwidth
            }
        },
        MAX_TOTAL_RANGE: 150, // Max range for any network type
        COMMUNICATION_LINE_DURATION: 500, // ms
        PACKET_SIZE: 512 // Default packet size in bytes
    },
    RSU: {
        NUM_RSUs: 2, // Number of RSUs along the road
        POSITION_X_OFFSET: 4, // Offset from road edge
        HEIGHT: 4, // Height of RSU pole
        SPACING: 40 // Minimum spacing between RSUs in meters
    },
    ENVIRONMENT: {
        GROUND_COLOR: 0x7f8c8d, // Urban ground color
        BUILDING_COLOR: 0x95a5a6, // Building color
        BUILDING_SPACING: 20, // Spacing between buildings
        BUILDING_HEIGHT_RANGE: { min: 10, max: 30 }, // Building height range
        BUILDING_WIDTH_RANGE: { min: 8, max: 15 }, // Building width range
        BUILDING_DEPTH_RANGE: { min: 8, max: 15 } // Building depth range
    },
    BASE_STATION: {
        POSITION_X_OFFSET: 10 // Offset from road edge
    },
    // Enhanced RL Reward System
    RL_REWARDS: {
        // Base rewards
        SUCCESSFUL_TRANSMISSION: 10,
        FAILED_TRANSMISSION: -15,
        
        // Message type multipliers (applied to base rewards)
        MESSAGE_TYPE_MULTIPLIERS: {
            SAFETY_MESSAGE: 3.0,      // Highest priority - 3x multiplier
            BASIC_CAM_MESSAGE: 2.0,   // High priority - 2x multiplier  
            TRAFFIC_MESSAGE: 1.5,     // Medium priority - 1.5x multiplier
            INFOTAINMENT_MESSAGE: 1.0 // Normal priority - 1x multiplier
        },
        
        // Latency penalties (per ms over requirement)
        LATENCY_PENALTY_PER_MS: 0.1,
        
        // Distance penalties
        DISTANCE_PENALTY_PER_METER: 0.05,
        
        // Network efficiency bonuses
        NETWORK_MATCH_BONUS: 5, // Bonus for using preferred network for message type
        HANDOVER_PENALTY: -8,   // Penalty for network handovers
        
        // QoS bonuses
        RELIABILITY_BONUS: 15,  // Bonus for meeting reliability requirements
        BANDWIDTH_EFFICIENCY_BONUS: 10, // Bonus for efficient bandwidth usage
        
        // Learning parameters
        LEARNING_RATE: 0.1,
        DISCOUNT_FACTOR: 0.95,
        EPSILON_START: 1.0,     // Initial exploration rate
        EPSILON_END: 0.01,      // Final exploration rate
        EPSILON_DECAY: 0.995    // Exploration decay rate
    }
}; 