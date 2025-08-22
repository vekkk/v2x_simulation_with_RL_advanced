# 🚗 Advanced V2X Simulation with Deep Reinforcement Learning

A sophisticated vehicular network simulation framework featuring **Double Deep Q-Networks (DDQN)** for intelligent Radio Access Technology (RAT) selection, advanced channel modeling, and real-time visualization.

## 🌟 Key Features

### **Advanced DRL Architecture**
- **Double DQN (DDQN)** implementation for stable learning
- **16-action space** with three modes:
  - **Single Mode**: Individual RAT selection (ITS-G5, C-V2X, LTE, 802.11p)
  - **Redundant Mode**: Dual-RAT transmission for reliability
  - **Division Mode**: Split payload across RATs for efficiency

### **Realistic Channel Modeling**
- **Pathloss modeling** with configurable exponents
- **Log-normal shadowing** for realistic signal variations
- **Rayleigh fading** for fast-fading effects
- **Queueing delays** based on network load (ρ/(1-ρ) model)
- **Handover tracking** between different RATs

### **Multi-Vehicle Simulation**
- **Real-time PyGame visualization** with 12+ vehicles
- **Dynamic mobility** across 4-lane highway
- **Interactive controls** (pause, speed, toggle DRL, reset)
- **Color-coded RAT selection** for visual analysis

### **Professional Results Generation**
- **Advanced metrics**: PRR, latency, throughput, energy, QoS violations
- **CDF plots** for reliability and latency distributions
- **Duplicate ratio tracking** for redundant transmissions
- **Handover analysis** for network stability
- **Automated PowerPoint presentation** generation

## 🏗️ Architecture

```
vehicular-network-drl-implementation_2/
├── configs/
│   └── config.py              # Centralized configuration management
├── src/
│   ├── drl/
│   │   └── dqn_agent.py       # DDQN implementation with action masking
│   ├── rat_selection/
│   │   └── action_mapper.py   # 16-action space builder and validator
│   ├── simulation/
│   │   ├── network_simulator.py    # Single-vehicle network simulation
│   │   ├── multi_sim.py           # Multi-vehicle coordination
│   │   ├── training_environment.py # Gym-compatible RL environment
│   │   └── baseline_algorithms.py  # 7 baseline algorithms for comparison
│   └── utils/
│       └── data_structures.py      # Performance metrics and state classes
├── realtime_viewer.py         # PyGame-based real-time visualization
├── train_drl_agent.py         # Training script with evaluation
├── visualize_results.py       # Advanced chart generation
├── generate_presentation.py   # Automated PowerPoint creation
├── demo_dashboard.py          # Live results dashboard
└── requirements.txt           # Python dependencies
```

## 🚀 Quick Start

### **1. Environment Setup**
```bash
# Create virtual environment (Python 3.9+ recommended)
python3.9 -m venv venv_py39
source venv_py39/bin/activate  # On Windows: venv_py39\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### **2. Run Real-Time Simulation**
```bash
# Launch interactive viewer with 12 vehicles using DRL
source venv_py39/bin/activate
PYTHONPATH=. python realtime_viewer.py 12 drl
```

**Controls:**
- **SPACE**: Pause/Resume
- **+/-**: Speed control
- **D**: Toggle DRL vs Heuristic
- **R**: Reset simulation
- **Q**: Quit

### **3. Training and Evaluation**
```bash
# Train DRL agent (300 episodes)
source venv_py39/bin/activate
PYTHONPATH=. python train_drl_agent.py

# Generate comprehensive results
python visualize_results.py

# Create presentation
python generate_presentation.py
```

### **4. View Results Dashboard**
```bash
# Live performance analysis
source venv_py39/bin/activate
PYTHONPATH=. python demo_dashboard.py
```

## 📊 Performance Results

### **DRL-DDQN vs Baselines**
| Algorithm | PRR | Latency (ms) | QoS Success | Duplicate Ratio |
|-----------|-----|---------------|-------------|-----------------|
| **DRL-DDQN** | **94.8%** | **26.1** | **93.5%** | **86%** |
| Redundant RSSI | 95.7% | 29.5 | 96.1% | 100% |
| Load Balancing | 90.6% | 18.8 | 80.1% | 0% |
| QoS-Aware | 90.0% | 20.1 | 78.8% | 0% |
| Static ITS-G5 | 81.8% | 45.6 | 45.3% | 0% |

### **Key Insights**
- **DRL learns optimal RAT combinations** for different scenarios
- **Redundant mode** provides highest reliability (95.7% PRR)
- **Division mode** balances throughput and energy efficiency
- **Advanced channel modeling** captures realistic network behavior

## ⚙️ Configuration

### **Simulation Parameters**
```python
@dataclass
class SimConfig:
    grid_size: Tuple[int, int] = (2000, 400)      # meters
    vehicles: int = 12                             # number of vehicles
    mobility_speed_mps: float = 15.0               # average speed
    rsu_spacing_m: int = 200                      # RSU placement
    bs_spacing_m: int = 500                       # Base station spacing
    pathloss_exp: float = 2.2                     # pathloss exponent
    noise_floor: float = -95.0                    # dBm
```

### **DRL Parameters**
```python
@dataclass
class DRLConfig:
    state_dim: int = 24                           # observation dimension
    hidden_sizes: Tuple[int, ...] = (128, 128, 64)
    learning_rate: float = 1e-3
    gamma: float = 0.99                           # discount factor
    epsilon: float = 0.1                          # exploration rate
```

## 🔬 Research Features

### **Advanced Action Space**
- **16 discrete actions** covering all RAT combinations
- **Action masking** for invalid RAT selections
- **Multi-objective rewards** balancing PRR, latency, energy, QoS

### **Enhanced Channel Model**
- **Shadowing**: Log-normal distribution (σ = 2.5 dB)
- **Fading**: Rayleigh distribution for fast variations
- **Queueing**: M/M/1 approximation with load dependency

### **Comprehensive Evaluation**
- **7 baseline algorithms** for performance comparison
- **Statistical analysis** with confidence intervals
- **Publication-ready visualizations** and metrics

## 📁 Output Files

### **Training Results**
- `data/models/dqn_final.pt` - Trained DRL model
- `data/results/eval_results.csv` - Performance metrics
- `data/results/training_log.csv` - Training progression

### **Visualizations**
- `data/results/cdf_prr.png` - Reliability CDFs
- `data/results/cdf_latency.png` - Latency CDFs
- `data/results/performance_bars.png` - Metric comparisons
- `data/results/advanced_metrics.png` - Duplicate ratios & handovers

### **Presentations**
- `data/presentations/vehicular_network_drl.pptx` - Automated PowerPoint

## 🎯 Use Cases

### **Academic Research**
- **DRL algorithm development** for vehicular networks
- **Performance benchmarking** against traditional methods
- **Channel modeling** research and validation

### **Industry Applications**
- **5G/6G network planning** and optimization
- **V2X infrastructure design** and deployment
- **Autonomous vehicle** communication protocols

### **Educational Purposes**
- **Reinforcement learning** concepts in networking
- **Vehicular communication** principles
- **Real-time simulation** and visualization

## 🤝 Contributing

This project demonstrates state-of-the-art DRL techniques for vehicular network optimization. Contributions are welcome for:

- **New DRL algorithms** (PPO, A3C, etc.)
- **Enhanced channel models** (3GPP, ITU-R standards)
- **Additional baseline algorithms**
- **Performance optimizations**
- **Documentation improvements**

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **PyTorch** for deep learning framework
- **OpenAI Gym** for RL environment standards
- **PyGame** for real-time visualization
- **Research community** for baseline algorithms and metrics

---

**🚗 Ready to revolutionize vehicular network optimization with Deep Reinforcement Learning!** ✨
