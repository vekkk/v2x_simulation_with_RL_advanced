# V2X Simulation - Quick Reference Guide

## 🚀 Essential Commands (Available in any terminal)

After opening a new terminal, these commands will be available:

### Quick Start
```bash
v2x-start           # Start the simulation server
v2x-open            # Open simulation in browser
v2x-start-and-open  # Start server and open browser automatically
```

### Navigation
```bash
v2x-cd              # Go to simulation directory
v2x-backup          # Go to backup directory
v2x-git             # Check git status
```

### Information
```bash
v2x-info            # Show all paths and commands
v2x-features        # Show simulation features
v2x-troubleshoot    # Show troubleshooting guide
```

### Backup & Maintenance
```bash
v2x-create-backup   # Create timestamped backup
```

## 📁 Important Paths

- **Project Root**: `/Users/viveks/Downloads/AI_ppt_final_simulation`
- **Current Version**: `/Users/viveks/Downloads/AI_ppt_final_simulation/backup_v2/advanced`
- **GitHub Repository**: https://github.com/vekkk/v2x_simulation_with_RL_advanced
- **Local Server**: http://localhost:8000/index_advanced.html

## 🔧 Manual Commands (if aliases don't work)

### Start Server
```bash
cd /Users/viveks/Downloads/AI_ppt_final_simulation/backup_v2/advanced
python3 -m http.server 8000
```

### Open Simulation
```bash
open http://localhost:8000/index_advanced.html
```

### Git Operations
```bash
cd /Users/viveks/Downloads/AI_ppt_final_simulation/backup_v2
git status
git add .
git commit -m "Your commit message"
git push
```

## 🎯 Simulation Features

### Fixed Issues ✅
- **Packet Loss**: Reduced from ~100% to ultra-low rates (DSRC: 0.5%, WiFi: 1%, LTE: 2%)
- **Vehicle Collisions**: Smart collision avoidance with 5m safety margins
- **Traffic Flow**: Bidirectional traffic with proper lane directions

### Traffic System 🚗
- **24 Vehicles**: Cars, trucks, and buses
- **Lane Directions**: 
  - Lanes 0,1: Forward ➡️
  - Lanes 2,3: Backward ⬅️
- **Adaptive Speeds**: Based on traffic conditions

### Network Performance 📡
- **DSRC**: 0.5% loss, 60m range, 20ms latency
- **WiFi**: 1% loss, 100m range, 50ms latency
- **LTE**: 2% loss, 250m range, 120ms latency
- **4 RSUs**: Providing 95% packet success improvement

### Controls 🎮
- **Arrow Keys**: Move base station
- **Toggle Buttons**: Show/hide analytics and dashboards
- **Real-time Monitoring**: Live packet success rates

## 🔧 Troubleshooting

### "Site cannot be reached"
```bash
v2x-start  # or manually start server
```

### All packets are red
- Check RSU positions and network configuration
- Current settings should provide 85-95% success rate
- Verify in `js/config/config.js`

### Vehicles colliding
- Collision avoidance is implemented with 5m safety margins
- Check `js/vehicles/VehicleManager.js` for logic

### Git issues
- Use GitHub Desktop for easy management
- Repository: https://github.com/vekkk/v2x_simulation_with_RL_advanced

## 📦 File Structure

```
backup_v2/
├── advanced/                    # Main simulation
│   ├── index_advanced.html      # Main interface
│   ├── js/
│   │   ├── config/config.js     # Network & vehicle settings
│   │   ├── network/NetworkManager.js  # V2X communication
│   │   ├── vehicles/VehicleManager.js # Traffic system
│   │   ├── visuals/SceneManager.js    # 3D rendering
│   │   └── ...
│   └── assets/                  # Textures and resources
├── .git/                        # Git repository
├── README.md                    # Full documentation
└── .gitignore                   # Git ignore rules
```

## 🌐 GitHub Repository

- **URL**: https://github.com/vekkk/v2x_simulation_with_RL_advanced
- **User**: vekkk
- **Email**: viveksingh117@gmail.com

---

**💡 Tip**: Type `v2x-info` in any terminal for quick access to this information! 