# V2X SNR-Based Communication System Guide

## Overview

The V2X simulation now features an advanced **Signal-to-Noise Ratio (SNR) based communication system** that intelligently selects the optimal network path for each vehicle based on real-time signal quality, distance calculations, and packet loss trade-offs.

## Key Features

### 🔧 SNR Calculation Engine
- **Real-time SNR computation** for all communication links
- **Distance-based path loss modeling** using industry-standard formulas
- **Frequency-dependent signal propagation** for different network types
- **Line-of-sight vs. non-line-of-sight** path considerations

### 📡 Multi-Network Support
- **LTE (Base Station)**: Long-range, high-latency cellular communication
- **WiFi (RSU)**: Medium-range, moderate-latency infrastructure communication  
- **DSRC (V2V)**: Short-range, low-latency vehicle-to-vehicle communication

### 🧠 Intelligent Network Selection
- **SNR vs. Packet Loss Trade-offs**: Balances signal quality with reliability
- **Message Type Optimization**: Prioritizes networks based on message requirements
- **Dynamic Path Switching**: Adapts to changing network conditions in real-time

## Technical Implementation

### SNR Calculation Formula

```javascript
SNR = Pt - PL - N0
```

Where:
- **Pt**: Transmit Power (dBm)
- **PL**: Path Loss (dB) = 20*log10(4π*d*f/c) + α*log10(d)
- **N0**: Noise Floor (-100 dBm)
- **d**: Distance (meters)
- **f**: Frequency (Hz)
- **α**: Path Loss Exponent (2.0-4.0 depending on environment)

### Network Parameters

| Network Type | Frequency | Tx Power | Range | Min SNR |
|--------------|-----------|----------|-------|---------|
| **LTE**      | 2.1 GHz   | 43 dBm   | 250m  | 5 dB    |
| **WiFi**     | 5.9 GHz   | 30 dBm   | 100m  | 8 dB    |
| **DSRC**     | 5.9 GHz   | 20 dBm   | 60m   | 10 dB   |

### Communication Path Selection Logic

1. **Calculate SNR** for all available communication options
2. **Filter by minimum SNR threshold** for reliable communication
3. **Calculate packet loss** based on SNR and network characteristics
4. **Score each option** using weighted criteria:
   - SNR Quality (40%)
   - Packet Loss Rate (30%)
   - Latency (20%)
   - Bandwidth (10%)
5. **Select highest scoring option** that meets message type requirements

## Real-Time Analytics Dashboard

### 📊 SNR Performance Metrics
- **Average SNR by Network Type**: Real-time signal quality monitoring
- **Communication Path Distribution**: Shows active connection types
- **Signal Quality Distribution**: Categorizes connections by SNR ranges

### 🎯 Quality Categories
- **Excellent (>20dB)**: Optimal signal quality, minimal packet loss
- **Good (15-20dB)**: Strong signal, reliable communication
- **Acceptable (10-15dB)**: Adequate signal, some packet loss expected
- **Poor (<10dB)**: Weak signal, high packet loss, unreliable

### 📈 Vehicle-Level Analytics
Each vehicle displays:
- **Current SNR Value**: Color-coded signal strength indicator
- **Active Network Type**: LTE/WiFi/DSRC with communication type
- **Communication Path**: Base Station/RSU/Vehicle-to-Vehicle
- **Signal Quality Status**: Visual indicator of connection reliability

## Distance-Based Performance

### Communication Zones

#### 🟢 Optimal Range (0-50m)
- **All networks available** with excellent SNR
- **DSRC preferred** for low-latency safety messages
- **Minimal packet loss** across all network types

#### 🟡 Extended Range (50-150m)
- **LTE and WiFi available** with good SNR
- **DSRC degraded** or unavailable
- **Moderate packet loss** for longer-range networks

#### 🔴 Far Range (150m+)
- **LTE only** with acceptable to poor SNR
- **Higher packet loss** and increased latency
- **Handover events** as vehicles move between coverage areas

## Message Type Optimization

### Safety Messages (DSRC Preferred)
- **Ultra-low latency requirement** (20ms)
- **High reliability needed** (99.5% success rate)
- **Prefers V2V DSRC** when available and reliable

### Traffic Messages (WiFi/LTE Balanced)
- **Moderate latency tolerance** (50-120ms)
- **Good reliability required** (98% success rate)
- **Balances between WiFi RSU and LTE base station**

### Infotainment Messages (LTE Preferred)
- **Higher latency acceptable** (120ms+)
- **Bandwidth priority** for data-heavy content
- **Prefers LTE** for consistent coverage

## Advanced Features

### 🔄 Dynamic Handover Management
- **Seamless transitions** between network types
- **Predictive handover** based on signal strength trends
- **Minimal service interruption** during network switches

### 📊 Performance Analytics
- **Real-time SNR monitoring** for all active connections
- **Historical performance tracking** for network optimization
- **Packet loss correlation** with distance and SNR

### 🎛️ Adaptive Parameters
- **Environment-specific path loss** modeling
- **Weather condition adjustments** (future enhancement)
- **Traffic density impact** on V2V communication

## Practical Applications

### 🎓 Research & Development
- **Network performance analysis** under various conditions
- **Algorithm validation** for V2X communication protocols
- **Coverage optimization** for RSU deployment

### 📋 Network Planning
- **Infrastructure placement** optimization
- **Coverage gap identification** and mitigation
- **Capacity planning** for different traffic scenarios

### 🎯 Demonstration & Training
- **Real-time visualization** of network selection decisions
- **Educational tool** for V2X communication concepts
- **Performance benchmarking** against industry standards

## Key Performance Indicators (KPIs)

### Signal Quality Metrics
- **Average SNR by Network**: Overall signal strength performance
- **SNR Distribution**: Percentage of connections in each quality category
- **Signal Degradation Rate**: How quickly SNR decreases with distance

### Communication Efficiency
- **Network Selection Accuracy**: Percentage of optimal path selections
- **Handover Success Rate**: Seamless transitions between networks
- **Message Delivery Success**: End-to-end communication reliability

### System Performance
- **Real-time Processing**: SNR calculations per second
- **Decision Latency**: Time to select optimal communication path
- **Resource Utilization**: Computational overhead of SNR system

## Usage Instructions

### 🚀 Starting the Simulation
1. **Launch the V2X simulation** from the main interface
2. **Observe the SNR Analytics Panel** on the right side of the screen
3. **Monitor real-time updates** of signal quality and network selection

### 📊 Interpreting the Data
- **Green SNR values**: Excellent signal quality (>15dB)
- **Yellow SNR values**: Acceptable signal quality (10-15dB)
- **Red SNR values**: Poor signal quality (<10dB)
- **Communication path indicators**: Show active network type and connection method

### 🔧 Advanced Analysis
- **Export SNR data** for detailed offline analysis
- **Monitor handover events** for network optimization insights
- **Track message type performance** across different network conditions

## Future Enhancements

### 🔮 Planned Features
- **Machine Learning Integration**: Predictive network selection based on historical patterns
- **Environmental Modeling**: Weather and terrain impact on signal propagation
- **Multi-Antenna Systems**: MIMO and beamforming simulation capabilities
- **5G Integration**: Support for next-generation cellular V2X communication

### 🎯 Advanced Analytics
- **Predictive SNR Modeling**: Forecast signal quality based on vehicle trajectories
- **Network Load Balancing**: Distribute traffic across available networks
- **Quality of Service (QoS)**: Guarantee performance for critical safety messages

## Conclusion

The SNR-based communication system represents a significant advancement in V2X simulation capabilities, providing:

- **Realistic signal modeling** based on industry standards
- **Intelligent network selection** optimized for message types and conditions
- **Comprehensive analytics** for research and development
- **Real-time visualization** of communication performance

This system enables researchers, engineers, and students to understand and optimize V2X communication networks with unprecedented detail and accuracy, supporting the development of safer and more efficient connected vehicle systems.

---

*For technical support or questions about the SNR communication system, please refer to the source code documentation or contact the development team.* 