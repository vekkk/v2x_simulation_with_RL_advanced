# V2X Network Simulation - Dashboard Controls Version

## 🎉 New Features - Individual Dashboard Controls

This version introduces **individual minimize/maximize functionality** for each dashboard panel, providing granular control over the interface layout.

### ✨ Key Features Added:

#### 🎯 **Individual Dashboard Controls**
- **Minimize Button**: Each dashboard has a `−` button in the header
- **Maximize Button**: When minimized, shows `+` button to expand
- **Smooth Animations**: CSS transitions for collapsing/expanding
- **Independent Control**: Each dashboard works independently

#### 📊 **Updated Dashboards** (10 Total):
1. **Network Statistics** - Core network metrics
2. **Message Types** - Message distribution visualization
3. **RL Learning** - AI learning progress tracking
4. **Network Performance** - DSRC/WiFi/LTE performance
5. **Vehicle Summary** - Vehicle counts and distributions
6. **Processing Dashboard** - Base station and RSU processing
7. **Traffic Light Control** - Intersection management
8. **RSU AI Agents** - AI agent performance metrics
9. **Live Vehicle Status** - Real-time vehicle information
10. **Interactive Controls** - Simulation control sliders

#### 🎨 **Visual Design**
- **Compact Tab Mode**: Minimized dashboards become slim tabs
- **Hover Effects**: Visual feedback on buttons
- **Consistent Styling**: Matches dark theme with green accents
- **Preserved Layout**: Other dashboards stay in place when one is minimized

### 🔧 **How to Use**

1. **Start Server**: `python3 -m http.server 8028`
2. **Open Browser**: Navigate to `http://localhost:8028/index_advanced.html`
3. **Find Minimize Button**: Look for `−` button in dashboard headers
4. **Click to Minimize**: Dashboard collapses to compact tab
5. **Click `+` to Expand**: Dashboard returns to full view

### 💡 **Benefits**

- **Screen Space Optimization**: Hide unused panels
- **Customizable Layout**: Show only needed dashboards
- **Quick Access**: Easily expand when needed
- **Better UX**: Cleaner, more organized interface

### 🚀 **Previous Features Maintained**

- **Global Dashboard Toggle**: Hide/show all dashboards
- **Draggable Panels**: Reposition dashboards by dragging headers
- **Analytics Toggle**: Show/hide performance plots
- **Reset Layout**: Restore default positions
- **Interactive Controls**: Speed, density, signal strength controls
- **Real-time Updates**: Live data in all panels

### 🛠️ **Technical Implementation**

#### CSS Classes Added:
- `.dashboard-header` - Header with title and minimize button
- `.dashboard-minimize-btn` - Minimize/maximize button styling
- `.dashboard-content` - Content wrapper for smooth transitions
- `.dashboard-minimized` - Minimized state styling

#### JavaScript Functions:
- `toggleDashboard(dashboardId)` - Individual dashboard toggle
- Enhanced button state management
- Preserved existing functionality

### 📁 **File Structure**
```
backup_v5_20250701_dashboard_controls/
├── index_advanced.html (Updated with dashboard controls)
├── css/styles.css
├── js/
│   ├── SimulationManager.js
│   ├── vehicles/VehicleManager.js (Enhanced with traffic light fixes)
│   ├── traffic/TrafficLightController.js
│   └── ... (other simulation files)
└── README.md (This file)
```

### 🔍 **Testing Status**
- ✅ Individual dashboard minimize/maximize working
- ✅ Smooth animations and transitions
- ✅ Button state management functional
- ✅ Layout preservation confirmed
- ✅ All existing features maintained
- ✅ Server running successfully on port 8028

### 🎯 **Perfect For**
- Users who want granular control over interface
- Scenarios requiring specific dashboard combinations
- Clean, customizable monitoring setup
- Professional presentation of simulation data

---

**Version**: v5.0 - Dashboard Controls  
**Date**: July 1, 2025  
**Status**: Ready for Production  
**Server**: `http://localhost:8028/index_advanced.html` 