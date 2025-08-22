from . import __package__  # silence linters
from typing import Optional
from configs.config import RewardWeights, QoS
from src.utils.types import PerformanceMetrics

class RewardCalculator:
    def __init__(self, weights: RewardWeights, qos: QoS):
        self.w = weights
        self.qos = qos

    def __call__(
        self,
        metrics: PerformanceMetrics,
        handover_happened: bool,
    ) -> float:
        r = 0.0
        r += self.w.w_prr * metrics.prr
        r += self.w.w_latency * (metrics.latency_ms / 100.0)  # normalize ~[0..2]
        r += self.w.w_throughput * (metrics.throughput_mbps / 10.0)  # normalize
        r += self.w.w_energy * (metrics.energy_j / 1000.0)
        if handover_happened:
            r += self.w.w_handover
        # QoS violation penalty
        violates = int((metrics.latency_ms > self.qos.max_latency_ms) or (metrics.prr < self.qos.min_prr))
        r += self.w.w_qos_violation * violates
        return float(r)
