# Advanced V2X Communication Simulation

A comprehensive Vehicle-to-Everything (V2X) communication simulation featuring realistic traffic patterns, RSU infrastructure, and AI-driven network optimization.

## 🚀 **Quick Start for New Users**

### **Installation Requirements:**
- **Python 3** (any version 3.6+) - *Most systems already have this*
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)
- **No other dependencies needed!** (All libraries loaded via CDN)

### **5-Minute Setup:**
```bash
# 1. Clone the repository
git clone https://github.com/vekkk/v2x_simulation_with_RL_advanced.git
cd v2x_simulation_with_RL_advanced/backup_v2/advanced

# 2. Start the server
python3 -m http.server 8000

# 3. Open browser to: http://localhost:8000/index_advanced.html
```

📋 **Need detailed installation help?** → See [`INSTALLATION_GUIDE.md`](../INSTALLATION_GUIDE.md)

## 🚀 Recent Improvements (Latest Version)

### ✅ Major Issues Fixed:
1. **Packet Loss Problem**: Reduced from ~100% to ultra-low rates (DSRC: 0.5%, WiFi: 1%, LTE: 2%)
2. **Vehicle Collisions**: Implemented smart collision avoidance with adaptive speeds
3. **Traffic Flow**: Added bidirectional traffic with proper lane directions

### 🎯 Key Features:
- **Bidirectional Traffic**: Lanes 0,1 forward ➡️, Lanes 2,3 backward ⬅️
- **RSU Infrastructure**: 4 Roadside Units providing 95% packet success improvement
- **AI Network Selection**: Intelligent network switching based on conditions
- **Real-time Analytics**: Live packet success rates, network performance metrics
- **Visual Indicators**: Directional arrows, range circles, communication lines

## 🛠️ Technical Specifications

### Network Types:
- **DSRC**: 0.5% loss, 60m range, 20ms latency
- **WiFi**: 1% loss, 100m range, 50ms latency  
- **LTE**: 2% loss, 250m range, 120ms latency

### Vehicle System:
- **24 Vehicles**: Cars, trucks, and buses with realistic behavior
- **Smart Collision Avoidance**: 5m safety margins with adaptive speeds
- **Message Types**: Safety, traffic, CAM, and infotainment messages
- **AI Learning**: Reinforcement learning for network optimization

### Infrastructure:
- **4 RSUs**: Strategic placement for optimal coverage
- **Base Station**: Movable with arrow keys
- **Extended Ranges**: Up to 250m maximum communication range

## 🚗 How to Run

1. **Start Local Server**:
   ```bash
   cd advanced
   python3 -m http.server 8000
   ```

2. **Open Simulation**:
   Navigate to `http://localhost:8000/index_advanced.html`

3. **Controls**:
   - Arrow keys: Move base station
   - Toggle buttons: Show/hide analytics and dashboards
   - Real-time monitoring of packet success rates

## 📊 Expected Performance

- **Packet Success Rate**: 85-95% (mostly green/blue/orange packets)
- **RSU Utilization**: Vehicles within 120m automatically use RSUs
- **Traffic Flow**: Smooth bidirectional movement without collisions
- **Network Handovers**: Intelligent switching between DSRC/WiFi/LTE

## 🏗️ Architecture

```
├── advanced/
│   ├── index_advanced.html     # Main simulation interface
│   ├── js/
│   │   ├── SimulationManager.js    # Core simulation controller
│   │   ├── config/config.js        # Network and vehicle parameters
│   │   ├── network/NetworkManager.js   # V2X communication logic
│   │   ├── vehicles/VehicleManager.js  # Traffic and collision system
│   │   ├── visuals/SceneManager.js     # 3D scene and road rendering
│   │   ├── ai/BaseStationAI.js         # AI network optimization
│   │   └── analytics/PlotManager.js    # Real-time charts
│   ├── css/styles.css          # UI styling
│   └── assets/                 # Textures and resources
```

## 🔧 Configuration

Key parameters in `js/config/config.js`:
- Vehicle count, speeds, and types
- Network ranges and packet loss rates
- RSU positions and coverage
- AI learning parameters

## 📈 Analytics Dashboard

Real-time monitoring includes:
- Packet success rates by network type
- Vehicle distribution across networks
- RSU utilization statistics
- AI learning progress
- Message type distribution

## 🎮 Interactive Features

- **Base Station Control**: Move with arrow keys to test coverage
- **Network Visualization**: See communication lines and range circles
- **Traffic Patterns**: Observe realistic bidirectional flow
- **Performance Metrics**: Live updates of simulation statistics

## 🚀 Future Enhancements

- Weather effects on communication
- Emergency vehicle prioritization
- Advanced AI routing algorithms
- Multi-intersection scenarios
- 5G network integration

---

**Version**: V2X Advanced Simulation with Bidirectional Traffic and Ultra-Low Packet Loss
**Last Updated**: June 2025
**Status**: Production Ready ✅ 