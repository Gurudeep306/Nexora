"""Graph Playground (Chapter 8 Live Lab) test vectors.

The lab's logic lives in client/src/gate/notes/labs/graphLogic.ts. This check computes with graphlib
(cross-checked with networkx when it is installed) degrees, components, cut vertices, bridges, the
bipartition or odd cycle, greedy and optimal colourings, chromatic number, Euler kind and Hierholzer
tour, a Hamiltonian cycle, spanning-tree counts (matrix-tree, brute force where small), matching and
independence numbers; writes lab_vectors_ch8.json and fails if the committed file is stale.

    python3 content/gate-notes/_checks/dm/l8_lab_vectors.py --write
"""
import json
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import graphlib as G  # noqa: E402

OUT = pathlib.Path(__file__).parent / "lab_vectors_ch8.json"
NAMED = {"petersen": G.petersen(), "k4": G.K(4), "k5": G.K(5), "k33": G.Kmn(3, 3), "k34": G.Kmn(3, 4), "c5": G.C(5), "c6": G.C(6),
         "w5": G.W(5), "q3": G.Q(3), "grid": G.grid(3, 3), "p8": G.Pn(8),
         "bridge": G.Graph(6, [(0, 1), (1, 2), (0, 2), (2, 3), (3, 4), (4, 5), (3, 5)])}
rng = random.Random(8)
RANDOM = []
for _ in range(14):
    n = rng.randint(1, 9)
    es = [(a, b) for a in range(n) for b in range(a + 1, n) if rng.random() < rng.choice([0.25, 0.4, 0.6])]
    RANDOM.append(G.Graph(n, es))


def case(name, g):
    G.crosscheck(g)
    bp = g.bipartition()
    chi = g.chromatic_number()
    out = {"name": name, "n": g.n, "edges": [list(e) for e in g.edges()], "degrees": g.degrees(), "components": g.components(),
           "cuts": g.cut_vertices(), "bridges": [list(e) for e in g.bridges()], "bipartite": bp[0], "bp": bp[1],
           "greedy": g.greedy_colouring(), "chi": chi, "colouring": g.colouring(chi) if g.n else [],
           "euler": g.euler(), "tour": g.euler_tour(), "ham": g.hamiltonian_cycle(),
           "trees": g.spanning_trees() if g.connected() and g.n else None, "nu": g.matching_number(), "alpha": g.independence_number()}
    if g.connected() and g.n and len(g.edges()) <= 16:
        assert g.spanning_trees_brute() == out["trees"]
    return out


VEC = {"named": [case(k, g) for k, g in NAMED.items()], "random": [case(f"r{i}", g) for i, g in enumerate(RANDOM)],
       "greedyOrders": [{"name": "c6", "order": [0, 3, 1, 4, 2, 5], "colours": G.C(6).greedy_colouring([0, 3, 1, 4, 2, 5])},
                        {"name": "k33", "order": [0, 3, 1, 4, 2, 5], "colours": G.Kmn(3, 3).greedy_colouring([0, 3, 1, 4, 2, 5])}]}
text = json.dumps(VEC, separators=(",", ":")) + "\n"
if "--write" in sys.argv:
    OUT.write_text(text)
assert OUT.exists() and OUT.read_text() == text, "lab_vectors_ch8.json is stale: run with --write"
print(f"l8_lab_vectors: {len(NAMED)} named and {len(RANDOM)} random graphs")
