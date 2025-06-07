# Vehicle Network Simulation

## Project Overview
This is a vehicle network simulation project that demonstrates the interaction between vehicles and base stations in a network environment. The simulation includes features for vehicle movement, network selection, and performance monitoring.

## Recent Changes and Issues

### Network Selection Issues
- Multiple vehicles were not selecting any network
- Investigation focused on the `BaseStationAI.js` file for potential issues
- Debugging logs were added to `NetworkManager.js` and `SimulationManager.js`

### Statistics and UI Updates
- Enhanced `SimulationManager.updateStats()` method to include additional statistics
- Improved accuracy of network statistics being passed to the UI
- Added comprehensive debugging logs for better tracking

## Project Structure
```
/
├── advanced/
│   ├── js/
│   │   ├── ai/
│   │   │   └── BaseStationAI.js
│   │   ├── network/
│   │   │   └── NetworkManager.js
│   │   ├── vehicles/
│   │   │   └── VehicleManager.js
│   │   ├── visuals/
│   │   │   └── SceneManager.js
│   │   ├── ui/
│   │   │   └── UIManager.js
│   │   ├── config/
│   │   │   └── config.js
│   │   ├── SimulationManager.js
│   │   └── main.js
│   ├── css/
│   │   └── styles.css
│   └── index_advanced.html
└── index.html
```

## Running the Project
1. Start a local server using Python:
   ```bash
   python3 -m http.server 8000
   ```
2. Access the simulation through your web browser at:
   - Main version: `http://localhost:8000`
   - Advanced version: `http://localhost:8000/advanced/index_advanced.html`

## Development Notes
- The project uses Three.js for 3D visualization
- Network selection logic is implemented in BaseStationAI.js
- Statistics and monitoring are handled by SimulationManager.js
- UI updates are managed through UIManager.js
