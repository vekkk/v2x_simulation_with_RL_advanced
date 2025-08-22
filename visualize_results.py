import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

RESULTS_DIR = "data/results"
os.makedirs(RESULTS_DIR, exist_ok=True)
DF = pd.read_csv(os.path.join(RESULTS_DIR, "eval_results.csv"))

# Aggregate means
agg = DF.groupby("policy").agg(
    prr=("prr", "mean"),
    latency_ms=("latency_ms", "mean"),
    throughput_mbps=("throughput_mbps", "mean"),
    energy_j=("energy_j", "mean"),
    qos_rate=("qos_violation", "mean"),
    dup_ratio=("duplicate_ratio", "mean"),
    handovers=("handover", "sum"),
).reset_index()
agg.to_csv(os.path.join(RESULTS_DIR, "summary_table.csv"), index=False)

# Bars
for m in ["prr", "latency_ms", "throughput_mbps", "energy_j", "qos_rate", "dup_ratio", "handovers"]:
    plt.figure(); plt.bar(agg["policy"], agg[m]); plt.ylabel(m); plt.xticks(rotation=30, ha="right"); plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, f"bar_{m}.png"), dpi=160); plt.close()

# CDFs: PRR and Latency for key policies
key = [p for p in DF["policy"].unique() if p in ("drl_ddqn", "signal_strength_single", "redundant_rssi", "division_rssi", "random")]

# One combined CDF per metric comparing policies
plt.figure()
for p in key:
    sub = DF[DF["policy"] == p]
    x = np.sort(sub["prr"].values); y = np.linspace(0, 1, len(x), endpoint=False)
    plt.plot(x, y, label=p)
plt.xlabel("PRR"); plt.ylabel("CDF"); plt.tight_layout(); plt.legend();
plt.savefig(os.path.join(RESULTS_DIR, "cdf_prr.png"), dpi=160); plt.close()

plt.figure()
for p in key:
    sub = DF[DF["policy"] == p]
    x = np.sort(sub["latency_ms"].values); y = np.linspace(0, 1, len(x), endpoint=False)
    plt.plot(x, y, label=p)
plt.xlabel("Latency (ms)"); plt.ylabel("CDF"); plt.tight_layout(); plt.legend();
plt.savefig(os.path.join(RESULTS_DIR, "cdf_latency.png"), dpi=160); plt.close()

print("Saved charts to data/results (bars + CDFs + table)")
