"""graph_toolkit.py — CI check for the DM graph toolkit (dm.md job E3).

Runs in CI via scripts/gate-notes/run_checks.py. Three parts:
  1. unit checks of every graphlib function on hand-known answers, including
     every dm PYQ that has a graph (computed property == official answer key);
  2. a cross-check of graphlib against networkx on 300 random small graphs
     (fixed seed) — networkx is only the referee, never the source of scenes;
  3. a sample scene per graphdraw layout passing check_drawing in both canvases.
"""
import math
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402
import graphlib as G  # noqa: E402
import graphdraw as D  # noqa: E402


# ── 1. unit checks on hand-known answers ─────────────────────────
def unit_checks():
    assert G.K(4).spanning_tree_count() == 16                      # τ(K4)
    assert G.K(5).spanning_tree_count() == 125                     # Cayley n^{n-2}
    assert G.petersen().chromatic_number()[0] == 3                # χ(Petersen)
    p = G.petersen()
    assert p.hamiltonian_cycle()[0] is None and p.hamiltonian_path()[0] is not None
    assert p.max_independent_set() == 4 and p.max_clique() == 2
    assert G.Q(3).vertex_connectivity() == 3                       # κ(Q3)
    assert G.Q(3).edge_connectivity() == 3
    assert G.C(5).automorphism_count() == 10                       # |Aut(C5)|
    import sympy as sp
    k = sp.Symbol("k")
    assert sp.expand(G.K(3).chromatic_polynomial() - k * (k - 1) * (k - 2)) == 0  # P(K3,k)
    assert G.Kmn(3, 4).max_matching()[0].__len__() == 3            # ν(K_{3,4})
    assert G.K(5).is_planar()[0] is False
    assert G.Kmn(3, 3).is_planar()[0] is False and G.K(4).is_planar()[0] is True and G.Q(3).is_planar()[0] is True
    assert G.Graph.havel_hakimi([3, 3, 3, 3])[0] and not G.Graph.havel_hakimi([3, 3, 3, 1])[0]
    assert G.Graph.is_graphic([2, 2, 2, 2]) and G.Graph.is_graphic([3, 1, 1, 1]) and not G.Graph.is_graphic([3, 3, 3, 1])
    assert G.C(6).is_eulerian_circuit() and not G.P(4).is_eulerian_circuit()
    circ, _ = G.C(6).hierholzer()
    assert len(circ) == 7 and circ[0] == circ[-1] and len({tuple(sorted((circ[i], circ[i+1]))) for i in range(6)}) == 6
    trail, _ = G.P(4).fleury()
    assert len(trail) == 4 and len({frozenset((trail[i], trail[i + 1])) for i in range(3)}) == 3
    t = G.Graph([0, 1, 2, 3, 4], [(0, 1), (1, 2), (2, 3), (3, 4)])
    seq, _ = t.prufer_encode()
    g2, _ = G.Graph.prufer_decode(seq)
    assert g2.isomorphic(t)[0] is not None
    assert len(G.K(4).spanning_trees()) == 16
    assert G.Kmn(2, 2).konig_identity_ok() is True and G.C(5).gallai_identity_ok() is True
    assert G.Kmn(2, 3).hall_violator([(0, 0), (0, 1)]) is None
    assert G.Q(3).count_perfect_matchings() == 9 and G.K(4).count_perfect_matchings() == 3
    assert G.labelled_graphs_with_k_edges(5, 3) == 120
    assert G.perfect_matchings_K2n(3) == 15 and G.matchings_Pn(10) == 89
    assert G.hamiltonian_cycles_Kn(5) == 12
    assert G.spanning_trees_Kn_with_fixed_edge(4) == 8 == sum(1 for x in G.K(4).spanning_trees() if x.has_edge(0, 1))
    assert sp.expand(G.C(4).chromatic_polynomial() - (k**4 - 4*k**3 + 6*k**2 - 3*k)) == 0
    # chromatic polynomial counts colourings: P(G, k) = number of proper k-colourings
    g = G.Graph([0, 1, 2, 3], [(0, 1), (1, 2), (2, 3), (3, 0), (0, 2)])
    P = g.chromatic_polynomial()
    for kk in (2, 3, 4, 5):
        brute = sum(1 for combo in __import__("itertools").product(range(kk), repeat=4)
                    if all(combo[u] != combo[v] for _, u, v in g.edges))
        assert int(P.subs(k, kk)) == brute
    # König edge colouring is proper and uses Δ colours on bipartite graphs
    for bg in (G.Kmn(3, 3), G.Q(3), G.grid(3, 3), G.C(6), G.crown(4)):
        ec, delta = bg.konig_edge_colouring()
        assert max(ec.values()) < delta and len(ec) == bg.m()
        for e in bg.edges:
            for e2 in bg.edges:
                if e2[0] != e[0] and (e[1] in (e2[1], e2[2]) or e[2] in (e2[1], e2[2])):
                    assert ec[e2[0]] != ec[e[0]]
        assert bg.edge_chromatic_number(10) == delta
    assert G.petersen().edge_chromatic_number(10) == 4  # class 2, Vizing
    assert G.K(5).edge_chromatic_number(10) == 5
    # faces of a plane embedding satisfy Euler: V − E + F = 2
    k4 = G.K(4)
    faces = k4.faces_of({0: [1, 3, 2], 1: [2, 3, 0], 2: [0, 3, 1], 3: [0, 1, 2]})
    assert len(faces) == 4 and k4.n() - k4.m() + len(faces) == 2
    # traces carry the documented events
    _, _, _, tr = G.pyq_cse_1999_a_15().bfs(1)
    assert ("dequeue", 1) in tr and ("tree_edge", 1, 2) in tr and ("visit", 1) in tr
    _, _, tr2 = G.C(4).dfs(0)
    assert ("back_edge", 3, 0) in tr2 or ("back_edge", 2, 0) in tr2


# ── 1b. every dm PYQ that has a graph, checked against the official key ──
def pyq_checks():
    q = __import__("json").loads(pathlib.Path(__file__).parents[4].joinpath("src/gate/questions.json").read_text())
    bank = q if isinstance(q, list) else q["questions"]
    keys = {x["id"]: x.get("answer") for x in bank if x.get("subject") == "dm"}
    assert sorted(G.pyq_cse_1999_a_15().articulation_points()[0]) == [2, 3, 5]      # cse-1999-a-15: D = 3
    assert G.pyq_cse_1999_b_53().edge_connectivity() == 2 == G.pyq_cse_1999_b_53().min_edge_cut()[0]  # cse-1999-b-53-b: 2
    assert G.pyq_cse_2004_cs_77().chromatic_number()[0] == 4                        # cse-2004-cs-77: C = 4
    g47 = G.pyq_cse_2005_cs_47()
    assert g47["G1"].is_planar()[0] is False and all(g47[x].is_planar()[0] is True for x in ("G2", "G3", "G4"))  # cse-2005-cs-47: A
    g26 = G.pyq_cse_2012_cs_26()
    assert g26["main"].isomorphic(g26["B"])[0] is not None                           # cse-2012-cs-26: B
    assert all(g26["main"].isomorphic(g26[x])[0] is None for x in ("A", "C", "D"))
    assert G.pyq_cse_2018_cs_18().chromatic_number()[0] == 3                         # cse-2018-cs-18: 3
    assert G.pyq_it_2008_it_3().chromatic_number()[0] == 3                           # it-2008-it-3: B = 3
    assert G.pyq_cse_2024_2_cs_50().chromatic_number()[0] == 2                       # cse-2024-2-cs-50: 2
    assert G.petersen().isomorphic(G.pyq_cse_2022_cs_40_optC())[0] is not None        # cse-2022-cs-40: C true
    assert G.K(4).is_planar()[0] is True and G.Q(3).is_planar()[0] is True            # cse-2011-cs-17: B
    d = G.pyq_cse_1998_b_62_b()
    assert d.directed and d.n() == 8 and d.m() == 8
    # keys exist for all of these in the bank
    for qid in ("cse-1999-a-15", "cse-1999-b-53-b", "cse-2004-cs-77", "cse-2005-cs-47",
                "cse-2011-cs-17", "cse-2012-cs-26", "cse-2018-cs-18", "it-2008-it-3",
                "cse-2022-cs-40", "cse-2024-2-cs-50", "cse-1998-b-62-b"):
        assert qid in keys, qid


# ── 2. networkx cross-check on 300 random small graphs ───────────
def cross_check():
    import networkx as nx
    import sympy as sp

    def nx_chi(Gnx):
        """χ from networkx's chromatic polynomial: min k with P(k) > 0."""
        P = sp.Poly(nx.chromatic_polynomial(Gnx))
        for kk in range(1, Gnx.number_of_nodes() + 2):
            if int(P.eval(kk)) > 0:
                return kk
        raise AssertionError("no k")
    rng = random.Random(20261118)
    checked = 0
    for _ in range(300):
        n = rng.randint(2, 8)
        p = rng.choice((0.2, 0.4, 0.6))
        verts = list(range(n))
        edges = [(u, v) for u in verts for v in verts if u < v and rng.random() < p]
        g = G.Graph(verts, edges)
        Gnx = nx.Graph(edges)
        Gnx.add_nodes_from(verts)
        assert sorted(g.degree_sequence()) == sorted(d for _, d in Gnx.degree())
        assert g.handshake_ok()
        assert len(g.components()) == nx.number_connected_components(Gnx)
        dist = g.bfs(0)[1]
        ndist = dict(nx.single_source_shortest_path_length(Gnx, 0))
        assert dist == ndist
        assert sorted(g.articulation_points()[0]) == sorted(nx.articulation_points(Gnx))
        assert {frozenset(e) for e in g.bridges()[0]} == {frozenset(e) for e in nx.bridges(Gnx)}
        assert g.vertex_connectivity() == nx.node_connectivity(Gnx)
        assert g.edge_connectivity() == nx.edge_connectivity(Gnx)
        assert g.is_bipartite() == nx.is_bipartite(Gnx)
        if not g.is_bipartite():
            odd = g.bipartition()[1]
            assert len(odd) % 2 == 1 and all(g.has_edge(odd[i], odd[(i + 1) % len(odd)]) for i in range(len(odd)))
        if n <= 7:
            assert g.chromatic_number()[0] == nx_chi(Gnx)
        nu = len(nx.max_weight_matching(Gnx, maxcardinality=True))
        assert len(g.max_matching()[0]) == nu
        if n <= 6 and nx.is_connected(Gnx):
            # matrix-tree vs enumeration (nx's Kirchhoff needs scipy; not installed)
            assert g.spanning_tree_count() == len(g.spanning_trees())
        assert g.is_eulerian_circuit() == nx.is_eulerian(Gnx)
        if n <= 8:
            assert (g.is_planar()[0] is True) == nx.check_planarity(Gnx)[0]
        # isomorphism: a relabelled copy must be isomorphic, and agree with nx
        perm = verts[:]
        rng.shuffle(perm)
        g2 = g.relabel(dict(zip(verts, perm)))
        m, cert = g.isomorphic(g2)
        assert m is not None and cert is None
        assert nx.is_isomorphic(Gnx, nx.relabel_nodes(Gnx, dict(zip(verts, perm))))
        # and against a different random graph of the same size
        edges3 = [(u, v) for u in verts for v in verts if u < v and rng.random() < p]
        g3 = G.Graph(verts, edges3)
        Gnx3 = nx.Graph(edges3)
        Gnx3.add_nodes_from(verts)
        ours = g.isomorphic(g3)[0] is not None
        assert ours == nx.is_isomorphic(Gnx, Gnx3)
        checked += 1
    assert checked == 300


# ── 3. one sample scene per layout passes check_drawing in both canvases ──
def scene_checks():
    samples = [
        ("circle", G.C(6), lambda g, w, h: D.layout_circle(g, w, h), 16, False),
        ("bipartite", G.Kmn(2, 3), lambda g, w, h: D.layout_bipartite(g, w, h), 16, False),
        ("grid", G.grid(3, 3), lambda g, w, h: D.layout_grid(g, w, h), 16, True),
        ("star", G.W(6), lambda g, w, h: D.layout_star(g, w, h), 16, True),
        ("layered", G.Graph([0, 1, 2, 3, 4, 5], [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5)]),
         lambda g, w, h: D.layout_layered(g, 0, w, h), 16, True),
        ("petersen", G.petersen(), lambda g, w, h: D.petersen_pos(w, h), 16, False),
        ("Q3", G.Q(3), lambda g, w, h: D.q3_pos(w, h), 14, True),
        ("K5", G.K(5), lambda g, w, h: D.k5_pos(w, h), 16, False),
        ("K3,3", G.Kmn(3, 3), lambda g, w, h: D.k33_pos(w, h), 16, False),
        ("dodecahedron", G.dodecahedron(), lambda g, w, h: D.dodecahedron_pos(w, h), 9, True),
    ]
    for name, g, fn, r, planar in samples:
        pw, pn = fn(g, 640, 360), fn(g, 360, 430)
        s = D.scene_graph(name, name, g, pw, pn, [dmlib.step("Start.")], r=r, NH=430)
        assert D.check_drawing(s, g, planar=planar), name
    pyqs = [
        ("cse-1998-b-62-b", G.pyq_cse_1998_b_62_b),
        ("cse-1999-a-15", G.pyq_cse_1999_a_15),
        ("cse-1999-b-53", G.pyq_cse_1999_b_53),
        ("cse-2004-cs-77", G.pyq_cse_2004_cs_77),
        ("cse-2012-cs-26", lambda: G.pyq_cse_2012_cs_26()["main"]),
        ("cse-2018-cs-18", G.pyq_cse_2018_cs_18),
        ("cse-2022-cs-40-optC", G.pyq_cse_2022_cs_40_optC),
        ("cse-2024-2-cs-50", G.pyq_cse_2024_2_cs_50),
    ]
    for name, bf in pyqs:
        g = bf()
        pw, pn = D.pyq_pos(name, 640, 360), D.pyq_pos(name, 360, 430)
        planar = (not g.directed) and g.n() <= 8 and g.is_planar()[0] is True
        r = 12 if planar else 14
        s = D.scene_graph(name, name, g, pw, pn, [dmlib.step("Start.")], r=r, NH=430)
        assert D.check_drawing(s, g, planar=planar), name
    g = G.pyq_it_2008_it_3()
    pw, pn = D.pyq_pos("it-2008-it-3", 640, 360), D.pyq_pos("it-2008-it-3", 360, 430)
    els = D.draw_graph(g, pw, pn, r=14, curved={frozenset(("00", "22"))})
    s = dmlib.spec("it-2008-it-3", (640, 360), (360, 430), "x", els, [dmlib.step("Start.")])
    assert D.check_drawing(s, g)
    # steps_from_trace turns a BFS run into captioned steps
    order, dist, tree, tr = G.pyq_cse_1999_a_15().bfs(1)
    steps = D.steps_from_trace(tr, {
        "visit": lambda v: (f"Visit {v}.", [("v_" + str(v), {"tone": "success"})]),
        "tree_edge": lambda u, v: (f"Tree edge {u}–{v}.", [("e_%s_%s" % tuple(sorted((str(u), str(v)))), {"tone": "success"})]),
    })
    assert steps and all(st["caption"] for st in steps)


if __name__ == "__main__":
    unit_checks()
    print("unit checks ok")
    pyq_checks()
    print("pyq checks ok")
    cross_check()
    print("networkx cross-check ok (300 graphs)")
    scene_checks()
    print("scene checks ok")
    print("graph_toolkit: ALL PASS")
