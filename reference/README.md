# Vehicle Network Simulation - Reference Version

This is a working reference implementation of the Vehicle Network Simulation. It contains a single-file version that demonstrates the core functionality of the simulation.

## Features
- 3D visualization of vehicles and road network
- Real-time vehicle movement
- Base station communication simulation
- Packet transfer visualization
- Statistics tracking (packets sent/received/lost)
- FPS counter
- Start/Stop controls

## Project Structure
```
reference/
├── README.md
└── working_simulation.html    # Single-file implementation
```

## Dependencies
- Three.js (r128)
- Three.js OrbitControls

## Quick Start
1. Start a local server in the project root:
   ```bash
   python -m http.server 8000
   ```
2. Open in browser:
   ```
   http://localhost:8000/reference/working_simulation.html
   ```

## Configuration
The simulation uses the following default configuration:
```javascript
const CONFIG = {
    ROAD: {
        LENGTH: 200,
        LANE_WIDTH: 4,
        NUM_LANES: 4
    },
    VEHICLES: {
        NUM_VEHICLES: 2,
        PACKET_SEND_INTERVAL: 1000 // ms
    },
    NETWORK: {
        LATENCY: 100, // ms
        PACKET_LOSS: 0.05, // 5%
        RANGE: 70 // meters
    }
};
```

## Visual Elements
- Road with 4 lanes and shoulders
- Dashed lane markers
- Base station (positioned outside the road)
- Two vehicles (car and truck)
- Communication lines (green for success, red for failure)

## Controls
- Start Simulation: Begins vehicle movement and communication
- Stop Simulation: Pauses the simulation
- Mouse controls:
  - Left click + drag: Rotate view
  - Right click + drag: Pan
  - Scroll: Zoom

## Statistics Panel
- Packets Sent: Total number of packets sent
- Packets Received: Successfully received packets
- Packets Lost: Failed or lost packets
- FPS: Current frames per second

## Notes
- This is a reference implementation with all code in a single file
- Used for testing and as a backup for the modular version
- Contains the latest working features before modularization
- Network parameters are tuned for ~80% packet success rate

## Troubleshooting
If the simulation doesn't start:
1. Check browser console for errors
2. Verify Three.js is loading correctly
3. Ensure the server is running on port 8000
4. Try clearing browser cache

## Next Steps
This version will be used as a reference while developing:
1. Modular version with separate components
2. ns-3 integration for realistic network simulation 