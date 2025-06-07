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
    NETWORK: {
        TYPES: {
            DSRC: {
                latencyMs: 20,
                packetLossRate: 0.02, // 2%
                range: 40, // meters
                color: 0xFFA500 // Orange
            },
            WIFI: {
                latencyMs: 50,
                packetLossRate: 0.05, // 5%
                range: 60, // meters
                color: 0x00FFFF // Cyan
            },
            LTE: {
                latencyMs: 120,
                packetLossRate: 0.10, // 10%
                range: 150, // meters
                color: 0x800080 // Purple
            }
        },
        MAX_TOTAL_RANGE: 150, // Max range for any network type
        COMMUNICATION_LINE_DURATION: 500 // ms
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
    REWARDS: {
        SUCCESS: 100,           // Reward for successful packet transfer
        FAILURE: -50,           // Penalty for failed packet transfer
        LATENCY_PENALTY: 0.1,   // Penalty multiplier for latency
        DISTANCE_PENALTY: 0.05  // Penalty multiplier for distance
    }
}; 