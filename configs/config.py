from dataclasses import dataclass, field
from typing import Tuple

@dataclass
class DRLConfig:
    state_dim: int = 24
    action_dim: int = 4  # ITS-G5, C-V2X, LTE, 802.11p
    hidden_sizes: Tuple[int, int, int] = field(default=(128, 128, 64))
    gamma: float = 0.99
    lr: float = 1e-3
    buffer_size: int = 50_000
    batch_size: int = 128
    epsilon_start: float = 1.0
    epsilon_end: float = 0.05
    epsilon_decay_episodes: int = 200
    target_tau: float = 0.01  # soft update

@dataclass
class RewardWeights:
    w_prr: float = 1.0
    w_latency: float = -0.6
    w_throughput: float = 0.7
    w_energy: float = -0.2
    w_handover: float = -0.3
    w_qos_violation: float = -1.0

@dataclass
class QoS:
    max_latency_ms: float = 80.0
    min_prr: float = 0.85

@dataclass
class SimConfig:
    max_steps: int = 200
    vehicles: int = 1
    grid_size: Tuple[int, int] = field(default=(1000, 1000))  # meters
    rsu_spacing_m: int = 250
    bs_spacing_m: int = 400
    
    # Channel & traffic knobs (dimensionless or simple units)
    noise_floor: float = -95.0  # dBm
    tx_power_dbm: float = 20.0
    pathloss_exp: float = 2.2
    base_load: float = 0.3  # baseline RAT load [0..1]
    mobility_speed_mps: float = 12.0  # ~43 km/h
    handover_penalty_ms: float = 20.0

@dataclass
class TrainingConfig:
    episodes: int = 300
    eval_episodes: int = 50
    seed: int = 42
    save_model_every: int = 50

@dataclass
class Config:
    drl: DRLConfig = field(default_factory=DRLConfig)
    reward: RewardWeights = field(default_factory=RewardWeights)
    qos: QoS = field(default_factory=QoS)
    sim: SimConfig = field(default_factory=SimConfig)
    training: TrainingConfig = field(default_factory=TrainingConfig)
