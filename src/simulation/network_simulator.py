import math
import numpy as np
from typing import Tuple, Dict

from configs.config import SimConfig, QoS
from src.utils.types import Vehicle, PerformanceMetrics, NetworkState, RATType

RATS = [RATType.ITS_G5, RATType.C_V2X, RATType.LTE, RATType.IEEE80211P]

class NetworkSimulator:
    def __init__(self, cfg: SimConfig, rng: np.random.Generator):
        self.cfg = cfg
        self.rng = rng
        self.t = 0
        self.vehicle = Vehicle(vid=0, x=0.0, y=cfg.grid_size[1] / 2, speed_mps=cfg.mobility_speed_mps)
        self.prev_action_tuple = None  # (mode, ...)
        self.prev_metrics = {rat.value: PerformanceMetrics(0.9, 70.0, 4.0, 10.0, 0) for rat in RATS}
        self.last_rssi = np.zeros(4)
        self.last_load = np.ones(4) * cfg.base_load

    def reset(self) -> NetworkState:
        self.t = 0
        self.vehicle.x = 0.0
        self.prev_action_tuple = None
        return self._observe()

    def step(self, action_tuple) -> Tuple[NetworkState, PerformanceMetrics, bool, Dict]:
        self._move_vehicle()
        availability = self._availability_mask()

        # Compute KPIs per mode
        if action_tuple[0] == "single":
            rat = action_tuple[1]
            metrics = self._simulate_kpis(rat, payload_factor=1.0)
            used_rats = {rat}
            duplicate_ratio = 0.0
        elif action_tuple[0] == "redundant":
            a, b = action_tuple[1], action_tuple[2]
            m1 = self._simulate_kpis(a, payload_factor=1.0)
            m2 = self._simulate_kpis(b, payload_factor=1.0)
            prr = 1.0 - (1.0 - m1.prr) * (1.0 - m2.prr)  # either arrives
            latency_ms = min(m1.latency_ms, m2.latency_ms)
            throughput_mbps = max(m1.throughput_mbps, m2.throughput_mbps)
            energy_j = m1.energy_j + m2.energy_j
            qos_viol = int((latency_ms > 80.0) or (prr < 0.85))
            metrics = PerformanceMetrics(prr, latency_ms, throughput_mbps, energy_j, qos_viol)
            used_rats = {a, b}
            duplicate_ratio = 1.0
        else:  # division
            a, b = action_tuple[1], action_tuple[2]
            m1 = self._simulate_kpis(a, payload_factor=0.5)
            m2 = self._simulate_kpis(b, payload_factor=0.5)
            prr = m1.prr * m2.prr  # need both halves
            latency_ms = max(m1.latency_ms, m2.latency_ms)  # wait for both
            throughput_mbps = m1.throughput_mbps + m2.throughput_mbps
            energy_j = 0.6 * (m1.energy_j + m2.energy_j)  # smaller payload halves
            qos_viol = int((latency_ms > 80.0) or (prr < 0.85))
            metrics = PerformanceMetrics(prr, latency_ms, throughput_mbps, energy_j, qos_viol)
            used_rats = {a, b}
            duplicate_ratio = 0.0

        handover = (self.prev_action_tuple is not None) and (set(self._rats_from_action(self.prev_action_tuple)) != set(used_rats))
        self.prev_action_tuple = action_tuple

        done = (self.t >= self.cfg.max_steps)
        info = {
            "availability": availability,
            "handover": handover,
            "metrics": metrics,
            "rats": list(used_rats),
            "mode": action_tuple[0],
            "duplicate_ratio": duplicate_ratio,
        }
        obs = self._observe()
        return obs, metrics, done, info

    # --- internal helpers ---
    def _rats_from_action(self, act):
        if act[0] == "single":
            return [act[1]]
        return [act[1], act[2]]

    def _move_vehicle(self):
        self.t += 1
        self.vehicle.x += self.vehicle.speed_mps
        if self.vehicle.x > self.cfg.grid_size[0]:
            self.vehicle.x = 0.0

    def _dist_to_nearest(self, spacing: int) -> float:
        grid_points = np.arange(0, self.cfg.grid_size[0] + spacing, spacing)
        return float(np.min(np.abs(grid_points - self.vehicle.x)))

    def _sig_strength(self, dist_m: float, rat_idx: int) -> float:
        # Pathloss + lognormal shadowing + fast fading (Rayleigh approx)
        pl = 10 * self.cfg.pathloss_exp * math.log10(max(dist_m, 1.0))
        shadow = self.rng.normal(0, getattr(self.cfg, 'shadowing_sigma_db', 2.5))
        fading = 10.0 * math.log10(max(self.rng.rayleigh(getattr(self.cfg, 'fading_scale', 1.0)), 1e-3))  # in dB
        rssi = self.cfg.tx_power_dbm - pl + shadow + fading
        return float(np.clip(rssi, -120, -30))

    def _availability_mask(self) -> np.ndarray:
        d_rsu = self._dist_to_nearest(self.cfg.rsu_spacing_m)
        d_bs = self._dist_to_nearest(self.cfg.rsu_spacing_m)
        rssi_g5 = self._sig_strength(d_rsu, 0)
        rssi_cvx = self._sig_strength(d_bs, 1)
        rssi_lte = self._sig_strength(d_bs, 2)
        rssi_11p = self._sig_strength(d_rsu, 3)
        self.last_rssi = np.array([rssi_g5, rssi_cvx, rssi_lte, rssi_11p])
        thr = np.array([-90, -95, -100, -90])
        return (self.last_rssi > thr).astype(int)

    def _simulate_kpis(self, action_rat: int, payload_factor: float = 1.0) -> PerformanceMetrics:
        availability = self._availability_mask()
        load = np.clip(self.last_load + self.rng.normal(0, 0.05, size=4), 0.05, 0.95)
        self.last_load = load
        rssi = self.last_rssi[action_rat]
        snr = rssi - self.cfg.noise_floor
        prr = 1 / (1 + np.exp(-(snr - 12) / 3))
        prr *= (1 - 0.4 * load[action_rat])
        prr = float(np.clip(prr, 0.0, 1.0))

        # Queueing delay model (approx): scales with rho/(1-rho) and payload size
        rho = float(load[action_rat])
        q_delay = getattr(self.cfg, 'queue_k_ms', 8.0) * (rho / max(1e-3, (1 - rho))) * payload_factor

        base_lat = 150 / max(snr, 5) + 50 * load[action_rat]
        lat_ms = float(np.clip(base_lat + q_delay + self.rng.normal(0, 5), 10, 500))

        cap = np.array([6, 10, 12, 5], dtype=float)
        thr = float(np.clip((snr / 25.0) * cap[action_rat] * (1 - load[action_rat]) * (1.0 / max(payload_factor, 1e-3)), 0.2, cap[action_rat]))

        base_e = np.array([8.0, 12.0, 14.0, 5])  # mJ per timestep (full payload)
        energy_j = float((base_e[action_rat] * payload_factor * (1 + 0.5 * load[action_rat])) / 1000.0)

        qos_violation = int((lat_ms > 80.0) or (prr < 0.85))
        return PerformanceMetrics(prr=prr, latency_ms=lat_ms, throughput_mbps=thr, energy_j=energy_j, qos_violation=qos_violation)

    def _observe(self) -> NetworkState:
        availability = self._availability_mask()
        d_rsu = self._dist_to_nearest(self.cfg.rsu_spacing_m)
        d_bs = self._dist_to_nearest(self.cfg.rsu_spacing_m)
        dist_rsu_n = d_rsu / max(1, self.cfg.rsu_spacing_m)
        dist_bs_n = d_bs / max(1, self.cfg.bs_spacing_m)
        speed_n = self.vehicle.speed_mps / 40.0
        vec = [speed_n, dist_rsu_n, dist_bs_n]
        vec += list((self.last_rssi + 120.0) / 90.0)
        vec += list(self.last_load)
        last_prr = [self.prev_metrics[i].prr for i in range(4)]
        last_lat = [self.prev_metrics[i].latency_ms / 200.0 for i in range(4)]
        last_thr = [self.prev_metrics[i].throughput_mbps / 12.0 for i in range(4)]
        vec += last_prr + last_lat + last_thr
        vec.append(1.0 if self.prev_action_tuple is not None else 0.0)
        return NetworkState(vector=np.array(vec, dtype=np.float32), availability_mask=availability.astype(np.int32), aux={
            "rssi": self.last_rssi.copy(),
            "load": self.last_load.copy(),
        })
