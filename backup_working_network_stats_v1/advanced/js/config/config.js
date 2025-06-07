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
                GEOMETRY: { width: 1.8, height: 1, length: 3.8 },
                COLOR: 0x00ff00,
                SPEED_RANGE: { min: 20, max: 40 }
            },
            TRUCK: {
                GEOMETRY: { width: 2.5, height: 2, length: 6 },
                COLOR: 0xff0000,
                SPEED_RANGE: { min: 10, max: 30 }
            },
            BUS: {
                GEOMETRY: { width: 2.2, height: 2.5, length: 8 },
                COLOR: 0x0000ff,
                SPEED_RANGE: { min: 15, max: 25 }
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
    BASE_STATION: {
        POSITION_X_OFFSET: 10 // Offset from road edge
    },
    REWARDS: {
        SUCCESS: 10,           // Reward for successful packet transfer
        FAILURE: -5,          // Penalty for failed packet transfer
        LATENCY_PENALTY: 0.1,  // Penalty per millisecond of latency
        DISTANCE_PENALTY: 0.01 // Penalty per unit of distance
    }
}; 