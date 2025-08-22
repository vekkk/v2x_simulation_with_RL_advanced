from dataclasses import dataclass
from typing import List, Optional, Dict
import numpy as np

from configs.config import Config
from src.simulation.network_simulator import NetworkSimulator
from src.rat_selection.action_mapper import build_actions

@dataclass
class VehicleRuntime:
    sim: NetworkSimulator
    y: float
    color_idx: int = 0  # chosen action index last step
    last_info: Dict = None

class MultiVehicleSim:
    def __init__(self, cfg: Config, n_vehicles: int = 8, seed: int = 42):
        self.cfg = cfg
        self.n = n_vehicles
        self.rng = np.random.default_rng(seed)
        self.vehicles: List[VehicleRuntime] = []
        self.actions = build_actions()  # 16 actions
        
        # spread vehicles across 4 lanes around midline
        mid_y = cfg.sim.grid_size[1] / 2
        lane_offsets = [-60, -20, 20, 60]
        speeds = np.clip(self.rng.normal(cfg.sim.mobility_speed_mps, 2.5, size=n_vehicles), 6.0, 22.0)
        for i in range(n_vehicles):
            sim = NetworkSimulator(cfg.sim, np.random.default_rng(int(seed + 1337 + i)))
            sim.vehicle.y = mid_y + lane_offsets[i % len(lane_offsets)]
            sim.vehicle.speed_mps = float(speeds[i])
            sim.vehicle.x = float(self.rng.uniform(0, cfg.sim.grid_size[0]))
            # Initialize with random action from expanded space
            sim.prev_action = self.rng.integers(0, len(self.actions))
            self.vehicles.append(VehicleRuntime(sim=sim, y=sim.vehicle.y))
        self.ticks = 0

    def reset(self):
        for vr in self.vehicles:
            vr.sim.reset()
            vr.sim.vehicle.y = vr.y
            vr.last_info = None
        self.ticks = 0

    def step(self, chooser_fn):
        """Advance all vehicles by 1 step. chooser_fn(sim, state_vec, avail_mask)->action_idx"""
        infos = []
        for vr in self.vehicles:
            ns = vr.sim._observe()
            action_idx = chooser_fn(vr.sim, ns.vector, ns.availability_mask)
            # Convert action index to action tuple
            action_tuple = self.actions[action_idx] if action_idx < len(self.actions) else ("single", 0)
            obs, metrics, done, info = vr.sim.step(action_tuple)
            vr.color_idx = int(action_idx)
            vr.last_info = info
            infos.append(info)
        self.ticks += 1
        return infos

    def get_positions(self):
        return [(vr.sim.vehicle.x, vr.sim.vehicle.y, vr.color_idx, vr.last_info) for vr in self.vehicles]
