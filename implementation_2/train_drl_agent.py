import os
import json
import numpy as np
import pandas as pd
import torch

from configs.config import Config
from src.simulation.training_environment import VehicularNetworkEnv
from src.drl.dqn_agent import DQNAgent
from src.simulation.baseline_algorithms import BASELINES
from src.rat_selection.action_mapper import action_valid_mask

RESULTS_DIR = "data/results"; MODELS_DIR = "data/models"
os.makedirs(RESULTS_DIR, exist_ok=True); os.makedirs(MODELS_DIR, exist_ok=True)


def evaluate_policy(env: VehicularNetworkEnv, chooser, episodes: int, name: str):
    rec = []
    for ep in range(episodes):
        s = env.reset(); done = False
        handovers = 0; dups = []
        while not done:
            ns = env.sim._observe()
            a_idx = chooser(env, s, ns.aux)
            s, r, done, info = env.step(a_idx)
            m = info["metrics"]
            handovers += int(info["handover"])
            dups.append(info.get("duplicate_ratio", 0.0))
            rec.append({
                "policy": name, "ep": ep,
                "prr": m.prr, "latency_ms": m.latency_ms,
                "throughput_mbps": m.throughput_mbps, "energy_j": m.energy_j,
                "qos_violation": m.qos_violation,
                "rat_or_mode": info.get("action_name", ""),
                "duplicate_ratio": info.get("duplicate_ratio", 0.0),
                "handover": int(info.get("handover", 0)),
            })
    return pd.DataFrame(rec)


def main():
    cfg = Config()
    env = VehicularNetworkEnv(cfg, seed=cfg.training.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    agent = DQNAgent(cfg.drl, action_dim=env.action_space.n, device=device)

    train_rec = []
    for ep in range(cfg.training.episodes):
        s = env.reset(); done = False
        losses = []; ep_reward = 0.0
        while not done:
            ns = env.sim._observe()
            vmask = action_valid_mask(env.actions, ns.availability_mask)
            a = agent.act(s, vmask)
            s2, r, done, info = env.step(a)
            vmask_next = action_valid_mask(env.actions, env.sim._observe().availability_mask)
            agent.push(s, a, r, s2, float(done), vmask_next)
            loss = agent.step()
            if loss: losses.append(loss)
            s = s2; ep_reward += r
        agent.anneal_epsilon(ep)
        train_rec.append({"episode": ep, "reward": ep_reward, "loss": float(np.mean(losses)) if losses else 0.0, "epsilon": agent.eps})
        if (ep + 1) % max(1, cfg.training.save_model_every) == 0:
            agent.save(os.path.join(MODELS_DIR, f"dqn_ep{ep+1}.pt"))
        if (ep + 1) % 10 == 0:
            print(f"[Ep {ep+1}] reward={ep_reward:.2f} eps={agent.eps:.3f} loss={np.mean(losses) if losses else 0:.4f}")

    agent.save(os.path.join(MODELS_DIR, "dqn_final.pt"))

    def drl_greedy(env, s, aux):
        vmask = action_valid_mask(env.actions, env.sim._observe().availability_mask)
        return agent.act(s, vmask, greedy=True)

    frames = [evaluate_policy(env, drl_greedy, cfg.training.eval_episodes, "drl_ddqn")]
    for name, chooser in BASELINES.items():
        frames.append(evaluate_policy(env, chooser, cfg.training.eval_episodes, name))
    df_all = pd.concat(frames, ignore_index=True)
    df_all.to_csv(os.path.join(RESULTS_DIR, "eval_results.csv"), index=False)
    pd.DataFrame(train_rec).to_csv(os.path.join(RESULTS_DIR, "training_curve.csv"), index=False)

    # Save config snapshot
    with open(os.path.join(RESULTS_DIR, "config.json"), "w") as f:
        json.dump(cfg.__dict__, f, default=lambda o: o.__dict__, indent=2)

    print("Saved eval_results.csv, training_curve.csv, dqn_final.pt, config.json")

if __name__ == "__main__":
    main()
