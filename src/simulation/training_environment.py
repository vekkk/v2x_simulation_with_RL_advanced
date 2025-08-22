import gym
import numpy as np
from gym import spaces

from configs.config import Config
from src.drl.reward_calculator import RewardCalculator
from src.simulation.network_simulator import NetworkSimulator
from src.rat_selection.action_mapper import build_actions, action_valid_mask, action_name

class VehicularNetworkEnv(gym.Env):
    metadata = {"render.modes": []}

    def __init__(self, cfg: Config, seed: int = 42):
        super().__init__()
        self.cfg = cfg
        self.rng = np.random.default_rng(seed)
        self.sim = NetworkSimulator(cfg.sim, self.rng)
        self.reward_fn = RewardCalculator(cfg.reward, cfg.qos)

        # Expanded action space (single/redundant/division)
        self.actions = build_actions()
        self.observation_space = spaces.Box(low=0.0, high=2.0, shape=(cfg.drl.state_dim,), dtype=np.float32)
        self.action_space = spaces.Discrete(len(self.actions))

        self.prev_action_idx = None
        self.steps = 0

    def reset(self):
        ns = self.sim.reset()
        self.prev_action_idx = None
        self.steps = 0
        return ns.vector

    def _valid_mask(self):
        ns = self.sim._observe()
        return action_valid_mask(self.actions, ns.availability_mask)

    def step(self, action_idx):
        act_tuple = self.actions[action_idx]
        ns, metrics, done, info = self.sim.step(act_tuple)
        handover = info["handover"]
        reward = self.reward_fn(metrics, handover)
        # track last metrics for observation composition
        for r in info.get("rats", []):
            self.sim.prev_metrics[r] = metrics
        self.prev_action_idx = action_idx
        self.steps += 1
        if self.steps >= self.cfg.sim.max_steps:
            done = True
        info.update({"action_name": action_name(self.actions, action_idx)})
        return ns.vector, float(reward), bool(done), info
