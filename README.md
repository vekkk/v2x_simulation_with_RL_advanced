# Vehicular Network DRL Demo

Functional demo for **hybrid RAT selection** (ITS-G5, C-V2X, LTE, 802.11p) using **DQN**. Includes a lightweight simulator, baselines, training/eval pipeline, charts, and PPT autogen.

## Quickstart
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Train + Evaluate + Visualize + PPT
python train_drl_agent.py
python visualize_results.py
python generate_presentation.py
```

> Output artifacts land in `data/results/` (CSVs + PNGs) and `data/models/` (PyTorch `.pt`).

## Layout

* `configs/config.py` — central dataclass configs (sim, DRL, rewards, training).
* `src/utils/types.py` — enums + dataclasses (RAT types, message types, state & metrics).
* `src/drl/dqn_agent.py` — DQN network + agent (replay, target net, epsilon schedule).
* `src/drl/reward_calculator.py` — multi-objective reward with tunable weights.
* `src/rat_selection/action_mapper.py` — action masking + fallback mapping.
* `src/simulation/network_simulator.py` — simplified vehicular network + KPIs.
* `src/simulation/training_environment.py` — Gym Env wrapper.
* `src/simulation/baseline_algorithms.py` — 6 baselines.
* `visualize_results.py` — comparison plots + usage pie charts.
* `generate_presentation.py` — 8–10 slides via `python-pptx`.

## Notes

* Default training: 300 episodes (≈ fast demo). Increase to 500+ for smoother curves.
* Repro: fixed seeds configurable via `Config.training.seed`.
* All paths are relative; results/PPT auto-create if missing.
