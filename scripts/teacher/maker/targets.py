"""Apply MakeHuman face targets to the base mesh's vertex positions (shared by the Teacher Maker steps).

A target is a MakeHuman name ("nose-scale-vert-incr", found in MPFB's target folders) or an absolute
path to a target file (.target or .target.gz), such as the person's own face detail
(solve_detail.py). Lines are "index dx dy dz" in MakeHuman units.
"""
import gzip
import os

import numpy as np

TARGETS = os.environ.get("MPFB_TARGETS", "/root/.config/blender/5.2/extensions/user_default/mpfb/data/targets")
TO_LOCAL = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]]) * 0.1
GROUPS = ("head", "forehead", "eyebrows", "eyes", "nose", "mouth", "cheek", "chin", "ears", "neck", "torso")


def find(name):
    if os.path.isabs(name):
        if not os.path.exists(name):
            raise FileNotFoundError(name)
        return name
    group = name.split("-")[1] if name[:2] in ("l-", "r-") else name.split("-")[0]
    for g in GROUPS + (group,):
        p = os.path.join(TARGETS, g, name + ".target.gz")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"target {name} not found under {TARGETS}")


def read(name):
    path = find(name)
    opener = gzip.open if path.endswith(".gz") else open
    idx, off = [], []
    with opener(path, "rt") as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                q = line.split()
                idx.append(int(q[0]))
                off.append((float(q[1]), float(q[2]), float(q[3])))
    return np.array(idx, int), np.array(off, float).reshape(-1, 3) @ TO_LOCAL.T


def apply(co, targets):
    co = co.copy()
    for name, w in targets.items():
        idx, off = read(name)
        np.add.at(co, idx, w * off)
    return co
