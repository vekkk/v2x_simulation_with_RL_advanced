import numpy as np
from src.rat_selection.action_mapper import build_actions

ACTIONS = build_actions()

# Helpers
_pairs = [(a[1], a[2]) for a in ACTIONS if a[0] in ("redundant", "division")]

# Baselines now choose among the expanded action space by constructing indices

def _idx_of(act_tuple):
    for i, a in enumerate(ACTIONS):
        if a == act_tuple:
            return i
    return 0

def static_single(r):
    return lambda env, obs, aux: _idx_of(("single", r))

# Choose top-2 by RSSI

def _top2_by_rssi(aux):
    rssi = aux.get("rssi", np.zeros(4))
    order = list(np.argsort(-np.array(rssi)))
    return order[0], order[1]

def random_policy(env, obs, aux):
    return int(np.random.randint(0, env.action_space.n))

def signal_strength_single(env, obs, aux):
    rssi = aux.get("rssi", np.zeros(4))
    r = int(np.argmax(rssi))
    return _idx_of(("single", r))

def load_balancing_single(env, obs, aux):
    load = aux.get("load", np.ones(4))
    r = int(np.argmin(load))
    return _idx_of(("single", r))

def qos_aware_single(env, obs, aux):
    rssi = aux.get("rssi", np.zeros(4)); load = aux.get("load", np.ones(4))
    bias = np.array([0.0, 0.2, 0.25, 0.0])
    score = (rssi + 120) / 90.0 - load + bias
    r = int(np.argmax(score))
    return _idx_of(("single", r))

def redundant_rssi(env, obs, aux):
    a, b = _top2_by_rssi(aux)
    return _idx_of(("redundant", min(a,b), max(a,b)))

def division_rssi(env, obs, aux):
    a, b = _top2_by_rssi(aux)
    return _idx_of(("division", min(a,b), max(a,b)))

BASELINES = {
    "static_its_g5": lambda env, obs, aux: static_single(0)(env, obs, aux),
    "static_c_v2x": lambda env, obs, aux: static_single(1)(env, obs, aux),
    "static_lte": lambda env, obs, aux: static_single(2)(env, obs, aux),
    "static_80211p": lambda env, obs, aux: static_single(3)(env, obs, aux),
    "random": random_policy,
    "signal_strength_single": signal_strength_single,
    "load_balancing_single": load_balancing_single,
    "qos_aware_single": qos_aware_single,
    "redundant_rssi": redundant_rssi,
    "division_rssi": division_rssi,
}
