from dataclasses import dataclass
from enum import Enum, auto
import numpy as np
from typing import Dict

class RATType(Enum):
    ITS_G5 = 0
    C_V2X = 1
    LTE = 2
    IEEE80211P = 3

class MessageType(Enum):
    CAM = auto()
    DENM = auto()

@dataclass
class Vehicle:
    vid: int
    x: float
    y: float
    speed_mps: float
    battery_j: float = 1e6

@dataclass
class PerformanceMetrics:
    prr: float
    latency_ms: float
    throughput_mbps: float
    energy_j: float
    qos_violation: int

@dataclass
class NetworkState:
    vector: np.ndarray  # shape (24,)
    availability_mask: np.ndarray  # shape (4,), 1 if RAT available
    aux: Dict[str, float]  # any extra info (e.g., per-RAT RSSI, loads)
