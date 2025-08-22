import os
import pandas as pd
import matplotlib.pyplot as plt
from configs.config import Config

def show_demo_dashboard():
    print("=" * 80)
    print("🚗 VEHICULAR NETWORK DRL - ADVANCED DEMO DASHBOARD")
    print("=" * 80)
    
    # Show configuration
    cfg = Config()
    print("\n📋 ADVANCED ALGORITHM CONFIGURATION:")
    print(f"   • DRL Architecture: {cfg.drl.state_dim}D → {cfg.drl.hidden_sizes} → 16 actions")
    print(f"   • Training: {cfg.training.episodes} episodes, {cfg.training.eval_episodes} eval")
    print(f"   • Channel Model: Pathloss (exp={cfg.sim.pathloss_exp}), Noise={cfg.sim.noise_floor}dBm")
    print(f"   • Action Space: Single + Redundant + Division modes")
    
    # Show results if available
    results_file = "data/results/eval_results.csv"
    if os.path.exists(results_file):
        print("\n📊 TRAINING RESULTS (Proving the Data):")
        df = pd.read_csv(results_file)
        
        # Top performers
        agg = df.groupby("policy").agg({
            "prr": "mean",
            "latency_ms": "mean", 
            "qos_violation": "mean",
            "duplicate_ratio": "mean"
        }).round(3)
        
        print("\n🏆 TOP PERFORMERS:")
        top = agg.sort_values("prr", ascending=False).head(5)
        for policy, row in top.iterrows():
            print(f"   {policy}: PRR={row['prr']:.3f}, Lat={row['latency_ms']:.1f}ms, QoS={100*(1-row['qos_violation']):.1f}%, Dup={row['duplicate_ratio']:.2f}")
        
        # DRL performance
        if "drl_ddqn" in agg.index:
            drl = agg.loc["drl_ddqn"]
            print(f"\n🤖 DRL-DDQN PERFORMANCE:")
            print(f"   • PRR: {drl['prr']:.3f} ({(drl['prr'] - agg['prr'].mean()):.3f} above average)")
            print(f"   • Latency: {drl['latency_ms']:.1f}ms ({(agg['latency_ms'].mean() - drl['latency_ms']):.1f}ms faster than average)")
            print(f"   • QoS Success: {100*(1-drl['qos_violation']):.1f}%")
            print(f"   • Duplicate Ratio: {drl['duplicate_ratio']:.2f}")
    
    print("\n🎮 DEMO COMMANDS:")
    print("   1. Real-time viewer: python realtime_viewer.py 12 drl")
    print("   2. Quick training: python train_drl_agent.py")
    print("   3. Generate charts: python visualize_results.py")
    print("   4. Create presentation: python generate_presentation.py")
    
    print("\n🔍 KEY INSIGHTS:")
    print("   • DRL learns optimal RAT combinations (single/redundant/division)")
    print("   • Redundant mode: Higher PRR, higher energy cost")
    print("   • Division mode: Balanced throughput and efficiency")
    print("   • Advanced channel modeling provides realistic performance")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    show_demo_dashboard()
