import itertools
import numpy as np

RAT_NAMES = ["ITS-G5", "C-V2X", "LTE", "802.11p"]

# Build action space: tuples of (mode, r1) or (mode, r1, r2)
# modes: 'single', 'redundant', 'division'

def build_actions(modes=("single", "redundant", "division")):
    actions = []
    # single
    if "single" in modes:
        for r in range(4):
            actions.append(("single", r))
    # pairwise combos
    pairs = list(itertools.combinations(range(4), 2))
    if "redundant" in modes:
        for (a, b) in pairs:
            actions.append(("redundant", a, b))
    if "division" in modes:
        for (a, b) in pairs:
            actions.append(("division", a, b))
    return actions


def action_valid_mask(actions, availability_mask: np.ndarray) -> np.ndarray:
    """Valid if RAT(s) are available. For pairs we require both available."""
    mask = []
    for act in actions:
        if act[0] == "single":
            mask.append(int(availability_mask[act[1]] == 1))
        else:  # redundant/division
            a, b = act[1], act[2]
            mask.append(int((availability_mask[a] == 1) and (availability_mask[b] == 1)))
    return np.array(mask, dtype=np.int32)


def action_name(actions, idx: int) -> str:
    act = actions[idx]
    if act[0] == "single":
        return f"single:{RAT_NAMES[act[1]]}"
    else:
        return f"{act[0]}:{RAT_NAMES[act[1]]}+{RAT_NAMES[act[2]]}"
