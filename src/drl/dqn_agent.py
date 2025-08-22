import random
from collections import deque
from typing import Tuple, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from configs.config import DRLConfig

class DQNNetwork(nn.Module):
    def __init__(self, state_dim: int, action_dim: int, hidden: Tuple[int, int, int]):
        super().__init__()
        h1, h2, h3 = hidden
        self.net = nn.Sequential(
            nn.Linear(state_dim, h1), nn.ReLU(),
            nn.Linear(h1, h2), nn.ReLU(),
            nn.Linear(h2, h3), nn.ReLU(),
            nn.Linear(h3, action_dim),
        )
    def forward(self, x):
        return self.net(x)

class ReplayBuffer:
    def __init__(self, capacity: int):
        self.buf = deque(maxlen=capacity)
    def push(self, s, a, r, s2, d, vm):
        self.buf.append((s, a, r, s2, d, vm))
    def sample(self, batch_size: int):
        batch = random.sample(self.buf, batch_size)
        s, a, r, s2, d, vm = map(np.array, zip(*batch))
        return s, a, r, s2, d, vm
    def __len__(self):
        return len(self.buf)

class DQNAgent:
    def __init__(self, cfg: DRLConfig, action_dim: int, device: str = "cpu"):
        self.cfg = cfg
        self.device = device
        self.action_dim = action_dim
        self.q = DQNNetwork(cfg.state_dim, action_dim, cfg.hidden_sizes).to(device)
        self.targ = DQNNetwork(cfg.state_dim, action_dim, cfg.hidden_sizes).to(device)
        self.targ.load_state_dict(self.q.state_dict())
        self.opt = optim.Adam(self.q.parameters(), lr=cfg.lr)
        self.buf = ReplayBuffer(cfg.buffer_size)
        self.gamma = cfg.gamma
        self.eps = cfg.epsilon_start

    def act(self, state: np.ndarray, valid_mask: np.ndarray, greedy: bool = False) -> int:
        if (random.random() < self.eps) and not greedy:
            valid_idxs = np.where(valid_mask == 1)[0]
            if len(valid_idxs) > 0:
                return int(np.random.choice(valid_idxs))
            return random.randrange(self.action_dim)
        with torch.no_grad():
            s = torch.tensor(state, dtype=torch.float32, device=self.device).unsqueeze(0)
            qvals = self.q(s).cpu().numpy().squeeze(0)
            qvals = np.where(valid_mask == 1, qvals, -1e9)
            return int(np.argmax(qvals))

    def push(self, s, a, r, s2, d, valid_mask_next):
        self.buf.push(s, a, r, s2, d, valid_mask_next)

    def soft_update(self):
        tau = self.cfg.target_tau
        for tp, p in zip(self.targ.parameters(), self.q.parameters()):
            tp.data.copy_(tau * p.data + (1.0 - tau) * tp.data)

    def step(self):
        if len(self.buf) < self.cfg.batch_size:
            return 0.0
        s, a, r, s2, d, vm = self.buf.sample(self.cfg.batch_size)
        s_t = torch.tensor(s, dtype=torch.float32, device=self.device)
        a_t = torch.tensor(a, dtype=torch.int64, device=self.device).unsqueeze(1)
        r_t = torch.tensor(r, dtype=torch.float32, device=self.device).unsqueeze(1)
        s2_t = torch.tensor(s2, dtype=torch.float32, device=self.device)
        d_t = torch.tensor(d, dtype=torch.float32, device=self.device).unsqueeze(1)
        vm_t = torch.tensor(vm, dtype=torch.float32, device=self.device)

        # Online Q for current
        q_sa = self.q(s_t).gather(1, a_t)
        with torch.no_grad():
            # Double DQN: pick action via online net, evaluate via target net; mask invalid
            q2_online = self.q(s2_t)
            q2_online[vm_t == 0] = -1e9
            a2 = torch.argmax(q2_online, dim=1, keepdim=True)
            q2_target = self.targ(s2_t).gather(1, a2)
            target = r_t + (1 - d_t) * self.gamma * q2_target
        loss = nn.functional.mse_loss(q_sa, target)
        self.opt.zero_grad(); loss.backward(); self.opt.step()
        self.soft_update()
        return float(loss.item())

    def anneal_epsilon(self, episode: int):
        frac = min(1.0, episode / self.cfg.epsilon_decay_episodes)
        self.eps = self.cfg.epsilon_start + frac * (self.cfg.epsilon_end - self.eps)

    def save(self, path: str):
        torch.save(self.q.state_dict(), path)
    def load(self, path: str):
        self.q.load_state_dict(torch.load(path, map_location=self.device))
        self.targ.load_state_dict(self.q.state_dict())
