# visualize_mobility.py
import os, time, numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation, PillowWriter

import torch

from configs.config import Config
from src.simulation.training_environment import VehicularNetworkEnv
from src.drl.dqn_agent import DQNAgent

OUT_DIR = "data/results"
os.makedirs(OUT_DIR, exist_ok=True)

def rsu_positions(grid_x, spacing, y):
    xs = np.arange(0, grid_x + spacing, spacing)
    ys = np.full_like(xs, y, dtype=float)
    return xs, ys

def bs_positions(grid_x, spacing, y):
    xs = np.arange(0, grid_x + spacing, spacing)
    ys = np.full_like(xs, y, dtype=float)
    return xs, ys

def main():
    cfg = Config()
    env = VehicularNetworkEnv(cfg, seed=cfg.training.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Try to load trained model; else run random-greedy
    agent = DQNAgent(cfg.drl, device=device)
    model_path = os.path.join("data", "models", "dqn_final.pt")
    have_model = os.path.exists(model_path)
    if have_model:
        agent.load(model_path)
        print(f"Loaded model: {model_path}")
    else:
        print("No trained model found; visualizing with epsilon-greedy/random.")

    # Run one short episode to collect positions & choices
    positions = []   # (x, y)
    chosen = []      # chosen RAT index each step
    avail_mask = []  # availability each step (4,)
    rssi_hist = []   # RSSI per step per RAT

    s = env.reset()
    done = False
    steps = 0

    while not done and steps < cfg.sim.max_steps:
        ns = env.sim._observe()
        if have_model:
            a = agent.act(s, ns.availability_mask, greedy=True)
        else:
            # pick best among available, else random
            valid = np.where(ns.availability_mask == 1)[0]
            a = int(np.random.choice(valid)) if len(valid) else np.random.randint(0, cfg.drl.action_dim)

        s, r, done, info = env.step(a)

        positions.append((env.sim.vehicle.x, env.sim.vehicle.y))
        chosen.append(a)
        avail_mask.append(info["availability"])
        rssi_hist.append(ns.aux["rssi"])
        steps += 1

    positions = np.array(positions)
    avail_mask = np.array(avail_mask)
    rssi_hist = np.array(rssi_hist)

    # Prep grid elements
    grid_x, grid_y = cfg.sim.grid_size
    mid_y = grid_y / 2.0
    rsu_x, rsu_y = rsu_positions(grid_x, cfg.sim.rsu_spacing_m, mid_y + 60)  # slight offset above road
    bs_x, bs_y   = bs_positions(grid_x, cfg.sim.bs_spacing_m,  mid_y - 60)   # slight offset below road

    # Color mapping for actions (RATs)
    rat_names = ["ITS-G5", "C-V2X", "LTE", "802.11p"]
    rat_colors = ["tab:blue", "tab:red", "tab:green", "tab:purple"]

    # --- Static trail plot (quick check) ---
    fig_static, ax_s = plt.subplots(figsize=(8, 4))
    ax_s.set_title("Vehicle Trail & Infrastructure")
    ax_s.set_xlim(-20, grid_x + 20)
    ax_s.set_ylim(mid_y - 150, mid_y + 150)
    ax_s.set_xlabel("x (m)"); ax_s.set_ylabel("y (m)")
    ax_s.scatter(rsu_x, rsu_y, marker="s", alpha=0.8, label="RSUs")
    ax_s.scatter(bs_x, bs_y, marker="^", alpha=0.8, label="Base Stations")
    ax_s.plot(positions[:,0], positions[:,1], alpha=0.8, label="Vehicle path")
    ax_s.legend(loc="upper right")
    trail_png = os.path.join(OUT_DIR, "mobility_trail.png")
    fig_static.tight_layout(); fig_static.savefig(trail_png, dpi=160); plt.close(fig_static)
    print(f"Saved: {trail_png}")

    # --- Animated view (GIF) ---
    fig, (ax_main, ax_legend) = plt.subplots(1, 2, figsize=(12, 4), gridspec_kw={"width_ratios":[3,1]})
    ax_main.set_title("Mobility & RAT Selection (animated)")
    ax_main.set_xlim(-20, grid_x + 20)
    ax_main.set_ylim(mid_y - 150, mid_y + 150)
    ax_main.set_xlabel("x (m)"); ax_main.set_ylabel("y (m)")

    # Infrastructure
    rsu_plot = ax_main.scatter(rsu_x, rsu_y, marker="s", label="RSU")
    bs_plot  = ax_main.scatter(bs_x, bs_y,  marker="^", label="BS")

    # Road centerline
    ax_main.axhline(mid_y, linestyle="--", alpha=0.4)

    # Vehicle point
    veh_dot = ax_main.scatter([], [], s=80)

    # Legend panel: show current RAT and availability
    ax_legend.axis("off")
    txt = ax_legend.text(0, 0.9, "", fontsize=10, va="top")
    bars = []
    for i, name in enumerate(rat_names):
        bars.append(ax_legend.barh(y=i, width=0.5, left=0, align="center")[0])
    ax_legend.set_ylim(-1, 4)
    ax_legend.set_ylim(-1, 4)
    ax_legend.set_yticks(range(4))
    ax_legend.set_yticklabels(rat_names)
    ax_legend.set_xlim(0, 1.0)

    def init():
        veh_dot.set_offsets([[-1000, -1000]])  # off-canvas
        txt.set_text("")
        return [veh_dot, txt, rsu_plot, bs_plot] + bars

    def update(i):
        x, y = positions[i]
        a = chosen[i]
        veh_dot.set_offsets([[x, y]])
        veh_dot.set_color(rat_colors[a])
        veh_dot.set_edgecolor("black")

        av = avail_mask[i]
        # Update availability bars (1.0 or 0.0)
        for j in range(4):
            bars[j].set_width(float(av[j]))
            bars[j].set_color(rat_colors[j] if av[j] == 1 else "lightgray")

        txt.set_text(
            f"Step: {i+1}/{len(positions)}\n"
            f"Chosen RAT: {rat_names[a]}\n"
            f"Availability: {list(av)}\n"
            f"RSSI: {np.round(rssi_hist[i],1)} dBm"
        )
        return [veh_dot, txt, rsu_plot, bs_plot] + bars

    anim = FuncAnimation(fig, update, frames=len(positions), init_func=init, blit=False, interval=80)
    gif_path = os.path.join(OUT_DIR, "mobility.gif")
    anim.save(gif_path, writer=PillowWriter(fps=12))
    plt.close(fig)
    print(f"Saved: {gif_path}")

if __name__ == "__main__":
    main()
