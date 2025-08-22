# Vehicle Network Simulation

A 3D visualization of Vehicle-to-Infrastructure (V2I) communication using Three.js.

## Features

### Core Functionality
- 3D visualization of vehicles and infrastructure
- Real-time vehicle movement simulation
- Base station (RSU) visualization
- Network communication visualization
- Packet transmission statistics

### Network Features
- V2I (Vehicle-to-Infrastructure) communication
- Distance-based packet loss calculation
- Network type selection based on vehicle position
- Real-time packet statistics (sent, received, lost)
- Visual communication lines between vehicles and base station

### UI Components
- Start/Stop simulation controls
- Real-time statistics display
- FPS counter
- Vehicle information panel
- Network status indicators

### Technical Implementation
- Modular architecture using ES6 modules
- Three.js for 3D visualization
- Real-time animation loop
- Collision detection and avoidance
- Lane-based vehicle movement
- Configurable simulation parameters

## Project Structure

```
advanced/
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── SimulationManager.js
│   ├── config/
│   │   └── config.js
│   ├── network/
│   │   └── NetworkManager.js
│   ├── ui/
│   │   └── UIManager.js
│   ├── vehicles/
│   │   └── VehicleManager.js
│   └── visuals/
│       └── SceneManager.js
└── index_advanced.html
```

## Components

### SimulationManager
- Main simulation controller
- Manages animation loop
- Coordinates between different managers
- Handles simulation state

### SceneManager
- Three.js scene setup
- Camera and renderer configuration
- Lighting setup
- Road and base station creation
- Scene updates

### VehicleManager
- Vehicle creation and management
- Lane assignment
- Collision detection
- Speed management
- Position updates

### NetworkManager
- V2I communication handling
- Packet transmission simulation
- Network type selection
- Packet loss calculation
- Communication line visualization

### UIManager
- UI element management
- Statistics updates
- Button state management
- Vehicle information display
- FPS counter

## Configuration

The simulation can be configured through `config.js`:
- Road dimensions
- Vehicle properties
- Network parameters
- Base station settings
- Simulation speed

## Usage

1. Start the local server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open `http://localhost:8000/advanced/index_advanced.html` in your browser

3. Click "Start Simulation" to begin

4. Monitor the statistics panel for:
   - Packets sent/received/lost
   - FPS
   - Vehicle information

## Current Achievements

- Working 3D visualization of vehicles and infrastructure
- Real-time vehicle movement with collision avoidance
- V2I communication visualization
- Packet transmission simulation
- Real-time statistics tracking
- Modular and maintainable codebase
- Configurable simulation parameters

## Future Enhancements

1. V2V (Vehicle-to-Vehicle) Communication
2. Enhanced Network Protocols
3. Security Features
4. Quality of Service (QoS)
5. Network Metrics
6. Environmental Factors

## Dependencies

- Three.js (r128)
- Modern web browser with ES6 support
