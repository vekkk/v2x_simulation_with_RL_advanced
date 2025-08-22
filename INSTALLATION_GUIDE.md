# 🚗 V2X Simulation - Installation Guide

## 📋 **What You Need to Install**

### ✅ **Required (Most systems already have this):**
- **Python 3** (any version 3.6+)
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)

### ❌ **NOT Required:**
- No Node.js, npm, or package managers
- No additional JavaScript libraries (loaded via CDN)
- No database or server software
- No complex build tools

---

## 🛠️ **Step-by-Step Installation**

### **Step 1: Check if Python 3 is installed**
```bash
python3 --version
```
If you see a version number (e.g., `Python 3.9.7`), you're good to go! Skip to Step 3.

### **Step 2: Install Python 3 (if needed)**

#### **macOS:**
```bash
# Option 1: Using Homebrew (recommended)
brew install python3

# Option 2: Download from python.org
# Visit https://www.python.org/downloads/macos/
```

#### **Windows:**
```bash
# Download from https://www.python.org/downloads/windows/
# Make sure to check "Add Python to PATH" during installation
```

#### **Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3
```

#### **Linux (CentOS/RHEL):**
```bash
sudo yum install python3
```

### **Step 3: Clone the Repository**
```bash
git clone https://github.com/vekkk/v2x_simulation_with_RL_advanced.git
cd v2x_simulation_with_RL_advanced
```

### **Step 4: Navigate to Simulation Directory**
```bash
cd backup_v2/advanced
```

### **Step 5: Start the Simulation**
```bash
# Start the local server
python3 -m http.server 8000

# Open your browser and go to:
# http://localhost:8000/index_advanced.html
```

---

## 🚀 **Alternative: One-Command Setup**

If you want to set up everything automatically:

```bash
# Clone and start in one go
git clone https://github.com/vekkk/v2x_simulation_with_RL_advanced.git && \
cd v2x_simulation_with_RL_advanced/backup_v2/advanced && \
python3 -m http.server 8000 && \
open http://localhost:8000/index_advanced.html
```

---

## 🔧 **Troubleshooting**

### **"python3: command not found"**
- **Solution**: Install Python 3 (see Step 2 above)
- **Alternative**: Try `python --version` - if it shows Python 3.x, use `python` instead of `python3`

### **"Address already in use" (Port 8000 busy)**
```bash
# Use a different port
python3 -m http.server 8080
# Then open: http://localhost:8080/index_advanced.html
```

### **Browser shows "This site can't be reached"**
- **Check**: Is the Python server still running?
- **Solution**: Make sure you're in the correct directory and the server is running

### **Simulation doesn't load properly**
- **Check**: Are you using a modern browser?
- **Solution**: Try Chrome or Firefox (best compatibility)
- **Check**: Is your internet connection working? (CDN resources need to load)

---

## 🌐 **Why No Complex Dependencies?**

This simulation is designed to be **plug-and-play**:

- **Three.js**: Loaded from CDN (`unpkg.com`)
- **Chart.js**: Loaded from CDN (`jsdelivr.net`)
- **All code**: Pure JavaScript ES6 modules
- **No build process**: Direct browser execution
- **No package managers**: No npm, yarn, or pip requirements

---

## 📊 **What You'll See After Installation**

✅ **Successful Installation Indicators:**
- 24 vehicles moving in bidirectional traffic
- Green/blue/orange packets (85-95% success rate)
- 4 RSUs with visible range circles
- Real-time analytics dashboard
- Smooth collision-free traffic flow

❌ **Installation Issues Indicators:**
- Blank white screen (CDN loading issues)
- All red packets (configuration problems)
- No vehicles moving (JavaScript errors)

---

## 🎯 **Next Steps After Installation**

1. **Explore the Simulation**:
   - Use arrow keys to move the base station
   - Toggle analytics dashboard
   - Watch packet success rates

2. **Read the Documentation**:
   - `QUICK_REFERENCE.md` - Essential commands
   - `README.md` - Technical details
   - `SETUP_COMPLETE.md` - Advanced configuration

3. **Customize (Optional)**:
   - Edit `js/config/config.js` for different parameters
   - Modify vehicle counts, network settings, etc.

---

## 💡 **Pro Tips**

- **Bookmark**: `http://localhost:8000/index_advanced.html`
- **Keep Terminal Open**: Don't close the Python server
- **Use Chrome DevTools**: F12 for debugging if needed
- **Check Console**: Look for any error messages

---

**🎉 That's it! You should now have a fully functional V2X simulation running locally.**

**Need Help?** Check the troubleshooting section above or refer to `QUICK_REFERENCE.md` for common solutions. 