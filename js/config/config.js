/**
 * Configuration parameters for the Vehicle Network Simulation
 */
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
        NUM_VEHICLES: 2,
        PACKET_SEND_INTERVAL: 1000, // ms
        TYPES: {
            CAR: {
                GEOMETRY: { width: 2, height: 1, length: 4 },
                COLOR: 0x00ff00,
                SPEED_RANGE: { min: 0.2, max: 0.4 }
            },
            TRUCK: {
                GEOMETRY: { width: 2.5, height: 2, length: 6 },
                COLOR: 0xff0000,
                SPEED_RANGE: { min: 0.1, max: 0.3 }
            }
        }
    },
    NETWORK: {
        LATENCY: 100, // ms
        PACKET_LOSS: 0.05, // 5%
        RANGE: 70, // meters
        COMMUNICATION_LINE_DURATION: 1000 // ms
    },
    SCENE: {
        CAMERA: {
            FOV: 75,
            NEAR: 0.1,
            FAR: 1000,
            POSITION: { x: 0, y: 30, z: 50 }
        },
        LIGHTING: {
            AMBIENT: { color: 0xffffff, intensity: 0.6 },
            DIRECTIONAL: { 
                color: 0xffffff, 
                intensity: 0.8,
                position: { x: 10, y: 20, z: 10 }
            }
        },
        COLORS: {
            ROAD: 0x2c3e50,
            SHOULDER: 0x95a5a6,
            LANE_MARKER: 0xffffff,
            GROUND: 0x1a472a,
            BASE_STATION: 0x7f8c8d,
            ANTENNA: 0x95a5a6,
            COMMUNICATION: {
                SUCCESS: 0x00ff00,
                FAILURE: 0xff0000
            }
        }
    },
    UI: {
        PANEL: {
            BACKGROUND: 'rgba(0, 0, 0, 0.7)',
            COLOR: 'white',
            PADDING: '10px',
            BORDER_RADIUS: '5px'
        },
        BUTTON: {
            BACKGROUND: '#4CAF50',
            DISABLED_BACKGROUND: '#cccccc',
            COLOR: 'white',
            PADDING: '8px 16px',
            MARGIN: '0 5px',
            BORDER_RADIUS: '4px'
        }
    }
}; 