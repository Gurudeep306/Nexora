"""graphlib.py — the Discrete Mathematics graph toolkit (dm.md job E3).

Pure Python: standard library + sympy only. Every algorithm returns both a
result and a trace of events, so viz scenes can be generated from a real run
(`graphdraw.steps_from_trace`). NetworkX is never imported here; it is used
only as an independent cross-check in graph_toolkit.py.

Trace events are tuples, e.g. ("visit", v), ("enqueue", v), ("tree_edge", u, v),
("back_edge", u, v); the exact kinds are documented per function.
"""
import heapq
import itertools
import math


def _segments_cross(p1, p2, p3, p4):
    """Proper crossing of segments p1p2 and p3p4 (endpoints not shared)."""
    def orient(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    d1, d2 = orient(p3, p4, p1), orient(p3, p4, p2)
    d3, d4 = orient(p1, p2, p3), orient(p1, p2, p4)
    return (d1 > 0) != (d2 > 0) and (d3 > 0) != (d4 > 0)


class Graph:
    """Simple or multigraph, directed or undirected.

    vertices: iterable of hashable labels. edges: (u, v) or (u, v, key) when
    multi=True. A self-loop contributes 2 to the undirected degree.
    """

    def __init__(self, vertices, edges, directed=False, multi=False):
        self.directed = directed
        self.multi = multi
        self.vertices = list(vertices)
        self._vset = set(self.vertices)
        self.edges = []  # (eid, u, v)
        self._adj = {v: [] for v in self.vertices}  # v -> [(eid, other)]
        for e in edges:
            u, v = e[0], e[1]
            key = e[2] if len(e) > 2 else len(self.edges)
            assert u in self._vset and v in self._vset, f"edge {e} uses an unknown vertex"
            eid = (u, v, key) if self.multi else (u, v)
            self.edges.append((eid, u, v))
            self._adj[u].append((eid, v))
            if not directed and u != v:
                self._adj[v].append((eid, u))
        if directed:
            self._in = {v: [] for v in self.vertices}
            for eid, u, v in self.edges:
                self._in[v].append((eid, u))

    # ── basic views ──────────────────────────────────────────────
    def n(self):
        return len(self.vertices)

    def m(self):
        return len(self.edges)

    def has_edge(self, u, v):
        return any(o == v for _, o in self._adj[u])

    def edge_between(self, u, v):
        return [eid for eid, o in self._adj[u] if o == v]

    def incident(self, v):
        return [eid for eid, _ in self._adj[v]]

    def neighbours(self, v):
        return [o for _, o in self._adj[v]]

    def degree(self, v):
        loops = sum(1 for _, u, w in self.edges if u == v == w)
        if self.directed:
            return len(self._adj[v]) + len(self._in[v]) + loops
        return len(self._adj[v]) + loops

    def degrees(self):
        return {v: self.degree(v) for v in self.vertices}

    def degree_sequence(self):
        return sorted((self.degree(v) for v in self.vertices), reverse=True)

    def adjacency_matrix(self):
        vs = self.vertices
        idx = {v: i for i, v in enumerate(vs)}
        M = [[0] * len(vs) for _ in vs]
        for _, u, v in self.edges:
            M[idx[u]][idx[v]] += 1
            if not self.directed and u != v:
                M[idx[v]][idx[u]] += 1
        return M

    def incidence_matrix(self):
        vs, es = self.vertices, self.edges
        idx = {v: i for i, v in enumerate(vs)}
        M = [[0] * len(es) for _ in vs]
        for j, (_, u, v) in enumerate(es):
            M[idx[u]][j] += 1
            if not self.directed and u != v:
                M[idx[v]][j] += 1
            elif u == v:
                M[idx[u]][j] += 1
        return M

    def copy(self):
        return Graph(self.vertices,
                     [(u, v) + ((k,) if self.multi else ()) for (k, u, v) in self.edges],
                     self.directed, self.multi)

    def relabel(self, mapping):
        return Graph([mapping.get(v, v) for v in self.vertices],
                     [(mapping.get(u, u), mapping.get(v, v)) + ((k,) if self.multi else ())
                      for (k, u, v) in self.edges], self.directed, self.multi)

    def subgraph(self, keep):
        keep = set(keep)
        return Graph([v for v in self.vertices if v in keep],
                     [(u, v) + ((k,) if self.multi else ()) for (k, u, v) in self.edges
                      if u in keep and v in keep], self.directed, self.multi)

    def induced_subgraph(self, S):
        return self.subgraph(S)

    def delete_edge(self, eid):
        return Graph(self.vertices, [(u, v) + ((k,) if self.multi else ()) for (k, u, v) in self.edges if k != eid],
                     self.directed, self.multi)

    def delete_edge_set(self, eids):
        eids = set(eids)
        return Graph(self.vertices, [(u, v) + ((k,) if self.multi else ()) for (k, u, v) in self.edges if k not in eids],
                     self.directed, self.multi)

    def delete_vertex(self, v):
        return self.subgraph([w for w in self.vertices if w != v])

    def contract_edge(self, eid):
        """Merge the endpoints of edge eid into one vertex named "u+v" (loops dropped)."""
        hit = next(((u, v) for (k, u, v) in self.edges if k == eid), None)
        assert hit, "no such edge"
        eu, ev = hit
        new = f"{eu}+{ev}"
        mapping = {w: (new if w in (eu, ev) else w) for w in self.vertices}
        verts = [w for w in self.vertices if w not in (eu, ev)] + [new]
        edges = []
        for k, u, v in self.edges:
            if k == eid:
                continue
            a, b = mapping[u], mapping[v]
            if a == b:
                if self.multi:
                    edges.append((a, b, k))
                continue
            edges.append((a, b) + ((k,) if self.multi else ()))
        if not self.multi:
            seen = set()
            dedup = []
            for e in edges:
                key = (e[0], e[1]) if self.directed else frozenset((e[0], e[1]))
                if key in seen:
                    continue
                seen.add(key)
                dedup.append(e)
            edges = dedup
        return Graph(verts, edges, self.directed, self.multi)

    def complement(self):
        edges = [(u, v) for u, v in itertools.combinations(self.vertices, 2) if not self.has_edge(u, v)]
        if self.directed:
            edges += [(u, v) for u in self.vertices for v in self.vertices
                      if u != v and not self.has_edge(u, v)]
        return Graph(self.vertices, edges, self.directed, False)

    def line_graph(self):
        es = self.edges
        edges = [(i, j) for i in range(len(es)) for j in range(i + 1, len(es))
                 if set(es[i][1:]) & set(es[j][1:])]
        return Graph(list(range(len(es))), edges)

    def union(self, other):
        assert self.directed == other.directed
        verts = list(dict.fromkeys(self.vertices + other.vertices))
        multi = self.multi or other.multi
        edges = [(u, v) + ((k,) if multi else ()) for (k, u, v) in self.edges] + [(u, v) + ((k,) if multi else ()) for (k, u, v) in other.edges]
        return Graph(verts, edges, self.directed, multi)

    def product(self, other):
        """Cartesian product G □ H (used for Q_n = P2 □ … □ P2)."""
        verts = [(g, h) for g in self.vertices for h in other.vertices]
        edges = [((g1, h), (g2, h)) for (_, g1, g2) in self.edges if g1 != g2 for h in other.vertices]
        edges += [((g, h1), (g, h2)) for (_, h1, h2) in other.edges if h1 != h2 for g in self.vertices]
        return Graph(verts, edges)

    def handshake_ok(self):
        """Σ deg(v) = 2m (loops count twice in both)."""
        return sum(self.degree(v) for v in self.vertices) == 2 * self.m()

    edge_weight = staticmethod(lambda eid: 1)  # override per graph for weighted runs

    # ── traversal ────────────────────────────────────────────────
    def bfs(self, start):
        """Returns (order, dist, tree_edges, trace). Events: enqueue, dequeue,
        visit, tree_edge, cross_edge."""
        dist = {start: 0}
        order, tree, trace = [], [], [("enqueue", start)]
        q = [start]
        while q:
            u = q.pop(0)
            trace.append(("dequeue", u))
            trace.append(("visit", u))
            order.append(u)
            for eid, w in self._adj[u]:
                if w not in dist:
                    dist[w] = dist[u] + 1
                    trace.append(("enqueue", w))
                    trace.append(("tree_edge", u, w))
                    tree.append((u, w))
                    q.append(w)
                elif w != u and frozenset((u, w)) not in {frozenset(t) for t in tree}:
                    trace.append(("cross_edge", u, w))
        return order, dist, tree, trace

    def dfs(self, start):
        """Returns (order, tree_edges, trace). Events: visit, tree_edge, back_edge."""
        seen, order, tree, trace = set(), [], [], []

        def go(u):
            trace.append(("visit", u))
            seen.add(u)
            order.append(u)
            for _, w in self._adj[u]:
                if w not in seen:
                    trace.append(("tree_edge", u, w))
                    tree.append((u, w))
                    go(w)
                elif w != u:
                    trace.append(("back_edge", u, w))

        go(start)
        return order, tree, trace

    def components(self):
        seen, comps = set(), []
        for v in self.vertices:
            if v not in seen:
                order, _, _, _ = self.bfs(v)
                seen.update(order)
                comps.append(order)
        return comps

    def is_connected(self):
        """All vertices in one component (isolated single vertex counts as connected)."""
        return len(self.components()) <= 1

    def edges_connected(self):
        """All non-isolated vertices in one component (used mid-Euler-walk)."""
        comps = [c for c in self.components() if any(self.degree(v) > 0 for v in c)]
        return len(comps) <= 1

    def distances(self):
        return {v: self.bfs(v)[1] for v in self.vertices}

    def diameter(self):
        return max((max(d.values()) for d in self.distances().values()), default=0)

    def bfs_layers(self, start):
        _, dist, _, _ = self.bfs(start)
        layers = {}
        for v, k in dist.items():
            layers.setdefault(k, []).append(v)
        return [layers[k] for k in sorted(layers)]

    # ── connectivity ─────────────────────────────────────────────
    def articulation_points(self):
        """Tarjan low-link (simple graphs). Returns (points, trace).
        Events: visit(v, disc, low), tree_edge(u, v), back_edge(u, v), articulation(v)."""
        disc, low, parent, pedge, trace, pts = {}, {}, {}, {}, [], []
        timer = [0]

        def go(u, is_root):
            disc[u] = low[u] = timer[0]
            timer[0] += 1
            trace.append(("visit", u, disc[u], low[u]))
            children = 0
            for eid, w in self._adj[u]:
                if w not in disc:
                    parent[w], pedge[w] = u, eid
                    children += 1
                    trace.append(("tree_edge", u, w))
                    go(w, False)
                    low[u] = min(low[u], low[w])
                    if low[w] >= disc[u] and (not is_root or children > 1):
                        if u not in pts:
                            pts.append(u)
                            trace.append(("articulation", u))
                elif eid != pedge.get(u):
                    low[u] = min(low[u], disc[w])
                    trace.append(("back_edge", u, w))

        for v in self.vertices:
            if v not in disc:
                go(v, True)
        return sorted(pts, key=str), trace

    def bridges(self):
        """Returns (bridges, trace); a tree edge (u,w) is a bridge iff low[w] > disc[u].
        Events: visit, tree_edge, back_edge, bridge(u, w)."""
        disc, low, parent, pedge, trace, br = {}, {}, {}, {}, [], []
        timer = [0]

        def go(u):
            disc[u] = low[u] = timer[0]
            timer[0] += 1
            trace.append(("visit", u, disc[u], low[u]))
            for eid, w in self._adj[u]:
                if w not in disc:
                    parent[w], pedge[w] = u, eid
                    trace.append(("tree_edge", u, w))
                    go(w)
                    low[u] = min(low[u], low[w])
                    if low[w] > disc[u]:
                        br.append((u, w))
                        trace.append(("bridge", u, w))
                elif eid != pedge.get(u):
                    low[u] = min(low[u], disc[w])
                    trace.append(("back_edge", u, w))

        for v in self.vertices:
            if v not in disc:
                go(v)
        return sorted(br, key=lambda e: (str(e[0]), str(e[1]))), trace

    def vertex_connectivity(self):
        """Brute force κ for n ≤ 10 (min |S| whose removal disconnects; n−1 for K_n)."""
        n = self.n()
        assert n <= 10, "vertex_connectivity is brute force, n ≤ 10"
        if n <= 1:
            return 0
        for k in range(0, n - 1):
            for S in itertools.combinations(self.vertices, k):
                rest = [v for v in self.vertices if v not in S]
                if not self.subgraph(rest).is_connected():
                    return k
        return n - 1

    def min_cut_partition(self):
        """Global min edge cut as a vertex partition (exact, n ≤ 10):
        returns (size, S, cut_edges)."""
        n = self.n()
        assert n <= 10 and not self.directed, "min_cut_partition: undirected, n ≤ 10"
        best = (self.m() + 1, None, [])
        verts = self.vertices
        for r in range(1, n):
            for S in itertools.combinations(verts, r):
                S = set(S)
                cut = [(k, u, v) for (k, u, v) in self.edges if (u in S) != (v in S)]
                if len(cut) < best[0]:
                    best = (len(cut), S, cut)
        return best

    def edge_connectivity(self):
        return self.min_cut_partition()[0]

    def min_edge_cut(self):
        size, S, cut = self.min_cut_partition()
        return size, cut

    # ── isomorphism ──────────────────────────────────────────────
    def invariants(self):
        deg = tuple(self.degree_sequence())
        tris = sum(1 for u, v, w in itertools.combinations(self.vertices, 3)
                   if self.has_edge(u, v) and self.has_edge(v, w) and self.has_edge(u, w))
        c4 = 0
        for u, v, w, x in itertools.combinations(self.vertices, 4):
            if (self.has_edge(u, v) and self.has_edge(v, w) and self.has_edge(w, x) and self.has_edge(x, u)
                    and not self.has_edge(u, w) and not self.has_edge(v, x)):
                c4 += 1
        return {"n": self.n(), "m": self.m(), "degrees": deg, "triangles": tris, "c4": c4}

    def isomorphic(self, other):
        """Exact isomorphism by invariant pruning + backtracking (n ≤ 12).
        Returns (mapping_or_None, certificate): certificate is None iff
        isomorphic, else the first invariant that differs."""
        assert self.n() == other.n() and self.n() <= 12, "isomorphic: equal n ≤ 12"
        a, b = self.invariants(), other.invariants()
        for k in a:
            if a[k] != b[k]:
                return None, f"invariant {k}: {a[k]} != {b[k]}"
        order = sorted(self.vertices, key=lambda v: -self.degree(v))
        adj_o = {v: set(other.neighbours(v)) for v in other.vertices}
        deg_o = {v: other.degree(v) for v in other.vertices}
        mapping, used = {}, set()

        def ok(v, w):
            if self.degree(v) != deg_o[w]:
                return False
            return all(mapping[u] in adj_o[w] for u in self.neighbours(v) if u in mapping)

        def go(i):
            if i == len(order):
                return True
            v = order[i]
            for w in other.vertices:
                if w in used or not ok(v, w):
                    continue
                mapping[v] = w
                used.add(w)
                if go(i + 1):
                    return True
                del mapping[v]
                used.discard(w)
            return False

        if self.m() == other.m() and go(0):
            return mapping, None
        return None, "same invariants, no edge-preserving bijection (backtracking, n ≤ 12)"

    def automorphism_count(self):
        """|Aut(G)|, brute force, n ≤ 9."""
        assert self.n() <= 9
        cnt = 0
        for perm in itertools.permutations(self.vertices):
            m = dict(zip(self.vertices, perm))
            if all(self.has_edge(m[u], m[v]) for _, u, v in self.edges) and self.m() == self.m():
                cnt += 1
        return cnt

    # ── trees ────────────────────────────────────────────────────
    def is_tree(self):
        return self.is_connected() and self.m() == self.n() - 1

    def prufer_encode(self):
        """Prüfer sequence with trace. Events: remove_leaf(leaf, neighbour), final_edge(u, v)."""
        assert self.is_tree(), "Prüfer needs a tree"
        g = self.copy()
        trace, seq = [], []
        while g.n() > 2:
            leaf = min((v for v in g.vertices if g.degree(v) == 1), key=str)
            nb = g.neighbours(leaf)[0]
            trace.append(("remove_leaf", leaf, nb))
            seq.append(nb)
            g = g.delete_edge(g.edge_between(leaf, nb)[0]).delete_vertex(leaf)
        trace.append(("final_edge", g.vertices[0], g.vertices[1]))
        return seq, trace

    @staticmethod
    def prufer_decode(seq):
        """Decode a Prüfer sequence. Returns (Graph, trace); events add_edge(u, v)."""
        seq = list(seq)
        n = len(seq) + 2
        deg = {i: 1 for i in range(n)}
        for s in seq:
            deg[s] += 1
        leaves = [i for i in range(n) if deg[i] == 1]
        heapq.heapify(leaves)
        edges, trace = [], []
        for s in seq:
            leaf = heapq.heappop(leaves)
            edges.append((leaf, s))
            trace.append(("add_edge", leaf, s))
            deg[leaf] -= 1
            deg[s] -= 1
            if deg[s] == 1:
                heapq.heappush(leaves, s)
        u, v = heapq.heappop(leaves), heapq.heappop(leaves)
        edges.append((u, v))
        trace.append(("add_edge", u, v))
        return Graph(list(range(n)), edges), trace

    def spanning_tree_count(self):
        """Matrix-tree theorem (exact, sympy)."""
        import sympy as sp
        vs = self.vertices
        if len(vs) <= 1:
            return 1
        A = self.adjacency_matrix()
        L = [[(self.degree(vs[i]) if i == j else 0) - A[i][j] for j in range(len(vs))]
             for i in range(len(vs))]
        M = sp.Matrix(L)[: len(vs) - 1, : len(vs) - 1]
        return int(M.det())

    def spanning_trees(self):
        """All spanning trees, enumerated (n ≤ 6)."""
        assert self.n() <= 6 and self.is_connected(), "spanning_trees enumerates, n ≤ 6"
        k = self.n() - 1
        out = []
        for S in itertools.combinations([e[0] for e in self.edges], k):
            g = Graph(self.vertices, [(u, v) + ((kk,) if self.multi else ()) for (kk, u, v) in self.edges if kk in set(S)],
                      self.directed, self.multi)
            if g.is_tree():
                out.append(g)
        return out

    def fundamental_cycles(self, tree_edges):
        """For each non-tree edge, the path it closes in the given spanning tree."""
        tree = Graph(self.vertices, tree_edges, False, False)
        tree_set = {frozenset(e) for e in tree_edges}
        parent = {}

        def build(u):
            seen = {u}
            q = [u]
            while q:
                x = q.pop(0)
                for _, w in tree._adj[x]:
                    if w not in seen:
                        seen.add(w)
                        parent[w] = x
                        q.append(w)

        build(tree.vertices[0])
        cycles = []
        for _, u, v in self.edges:
            if frozenset((u, v)) in tree_set:
                continue
            path = [v]
            while path[-1] in parent and path[-1] != u:
                path.append(parent[path[-1]])
            if path[-1] != u:
                parent.clear()
                build(u)
                path = [v]
                while path[-1] != u:
                    path.append(parent[path[-1]])
            path.reverse()
            cycles.append(path)
        return cycles

    def kruskal(self):
        """Kruskal MST with trace. Events: consider(eid, w), take(eid),
        skip(eid, reason), done(taken)."""
        assert not self.directed
        w = self.edge_weight
        parent = {v: v for v in self.vertices}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        trace, taken = [], []
        for eid, u, v in sorted(self.edges, key=lambda e: (w(e[0]), str(e[0]))):
            trace.append(("consider", eid, w(eid)))
            ru, rv = find(u), find(v)
            if ru != rv:
                parent[ru] = rv
                taken.append(eid)
                trace.append(("take", eid))
            else:
                trace.append(("skip", eid, "would form a cycle"))
        trace.append(("done", taken))
        return taken, trace

    def prim(self, start):
        """Prim from start with trace. Events: take(eid, w), skip(eid, w), visit(v), done."""
        w = self.edge_weight
        trace, taken = [], []
        in_tree = {start}
        pool = []
        for eid in self.incident(start):
            o = next(v for e2, v in self._adj[start] if e2 == eid)
            heapq.heappush(pool, (w(eid), str(eid), eid, start, o))
        while pool:
            wt, _, eid, u, v = heapq.heappop(pool)
            if v in in_tree:
                trace.append(("skip", eid, wt))
                continue
            trace.append(("take", eid, wt))
            trace.append(("visit", v))
            taken.append(eid)
            in_tree.add(v)
            for eid2, o in self._adj[v]:
                if o not in in_tree:
                    heapq.heappush(pool, (w(eid2), str(eid2), eid2, v, o))
        trace.append(("done", taken))
        return taken, trace

    # ── Euler / Hamilton ─────────────────────────────────────────
    def is_eulerian_circuit(self):
        return self.is_connected() and all(self.degree(v) % 2 == 0 for v in self.vertices)

    def is_eulerian_trail(self):
        if not self.is_connected():
            return False
        return len([v for v in self.vertices if self.degree(v) % 2]) in (0, 2)

    def hierholzer(self, start=None):
        """Euler circuit by walking and splicing. Returns (circuit, trace).
        Events: start(v), walk(u, v), done(circuit)."""
        assert self.is_eulerian_circuit(), "needs an Eulerian graph"
        start = start or self.vertices[0]
        trace = [("start", start)]
        remaining = {v: list(self._adj[v]) for v in self.vertices}
        stack = [start]
        circuit = []
        while stack:
            u = stack[-1]
            if remaining[u]:
                eid, w = remaining[u].pop()
                if not self.directed and u != w:
                    remaining[w].remove((eid, u))
                trace.append(("walk", u, w))
                stack.append(w)
            else:
                circuit.append(stack.pop())
        circuit.reverse()
        trace.append(("done", circuit))
        return circuit, trace

    def fleury(self, start=None):
        """Fleury's rule: never cross a bridge unless forced. Returns (trail, trace).
        Events: take(u, v), bridge_forced(u, v), done(trail)."""
        assert self.is_eulerian_trail(), "needs an Eulerian-trail graph"
        odd = [v for v in self.vertices if self.degree(v) % 2]
        start = start or (odd[0] if odd else self.vertices[0])
        g = self.copy()
        trail = [start]
        trace = []
        u = start
        while g.m() > 0:
            eid = None
            for e in g.incident(u):
                g2 = g.delete_edge(e)
                if g2.m() == 0 or g2.edges_connected():
                    eid = e
                    break
            forced = eid is None
            if forced:
                eid = g.incident(u)[0]
            _, _, v = next(e for e in g.edges if e[0] == eid)
            trace.append(("bridge_forced" if forced else "take", u, v))
            trail.append(v)
            g = g.delete_edge(eid)
            u = v
        trace.append(("done", trail))
        return trail, trace

    def hamiltonian_cycle(self, limit=12):
        """Backtracking, n ≤ limit. Returns (cycle_or_None, trace).
        Events: try(u, v), accept(u, v), backtrack(v), done(result)."""
        n = self.n()
        assert n <= limit, f"hamiltonian_cycle: n ≤ {limit}"
        trace = []
        path = [self.vertices[0]]

        def go():
            if len(path) == n:
                return path + [path[0]] if self.has_edge(path[-1], path[0]) else None
            for w in self.neighbours(path[-1]):
                if w in path:
                    continue
                trace.append(("try", path[-1], w))
                path.append(w)
                trace.append(("accept", path[-2], w))
                r = go()
                if r:
                    return r
                path.pop()
                trace.append(("backtrack", w))
            return None

        r = go()
        trace.append(("done", r is not None))
        return r, trace

    def hamiltonian_path(self, limit=12):
        """Backtracking, n ≤ limit. Returns (path_or_None, trace)."""
        n = self.n()
        assert n <= limit
        trace = []
        path = [self.vertices[0]]

        def go():
            if len(path) == n:
                return list(path)
            for w in self.neighbours(path[-1]):
                if w in path:
                    continue
                trace.append(("try", path[-1], w))
                path.append(w)
                r = go()
                if r:
                    return r
                path.pop()
                trace.append(("backtrack", w))
            return None

        r = go()
        trace.append(("done", r is not None))
        return r, trace

    def dirac_ok(self):
        """Dirac sufficient condition: n ≥ 3 and min degree ≥ n/2."""
        return self.n() >= 3 and all(self.degree(v) >= self.n() / 2 for v in self.vertices)

    def ore_ok(self):
        """Ore sufficient condition: deg(u)+deg(v) ≥ n for every non-adjacent pair."""
        n = self.n()
        return all(self.has_edge(u, v) or self.degree(u) + self.degree(v) >= n
                   for u, v in itertools.combinations(self.vertices, 2))

    # ── planarity ────────────────────────────────────────────────
    def euler_bounds(self):
        """Necessary planarity bounds from Euler's formula (simple graphs)."""
        n, m = self.n(), self.m()
        tri_free = self.invariants()["triangles"] == 0
        bound = (m <= 3 * n - 6) if n >= 3 else True
        return {"n": n, "m": m, "m_le_3n_minus_6": bound,
                "triangle_free": tri_free,
                "m_le_2n_minus_4_if_triangle_free": ((m <= 2 * n - 4) if (tri_free and n >= 3) else None)}

    def is_planar(self):
        """Exact for n ≤ 8 via Kuratowski-subdivision search; otherwise Euler
        bounds only. Returns (True/False/"bounds", certificate)."""
        n, m = self.n(), self.m()
        if n < 3:
            return True, "n < 3: always planar"
        b = self.euler_bounds()
        if not b["m_le_3n_minus_6"]:
            return False, f"m={m} > 3n−6={3 * n - 6}"
        if n > 8:
            return "bounds", b
        k = self._kuratowski()
        return (False, f"contains a subdivision of {k}") if k else (True, "no K5/K3,3 subdivision (n ≤ 8, exhaustive)")

    def _kuratowski(self):
        """Exhaustive edge-subset search (n ≤ 8) for a subgraph that is a
        subdivision of K5 or K3,3: the degree pattern must be five 4s / six 3s
        plus degree-2 vertices, and suppressing the degree-2 vertices must
        yield exactly K5 (10 edges) or K3,3 (9 edges)."""
        n, m = self.n(), self.m()
        assert n <= 8
        eids = [e[0] for e in self.edges]
        for k in range(9, min(m, 13) + 1):
            for S in itertools.combinations(eids, k):
                Sset = set(S)
                deg = {v: 0 for v in self.vertices}
                for e in self.edges:
                    if e[0] in Sset:
                        deg[e[1]] += 1
                        deg[e[2]] += 1
                ds = sorted(deg.values(), reverse=True)
                n2 = sum(1 for d in ds if d == 2)
                tail_ok = all(d in (0, 2) for d in ds[5:])
                is_k5_shape = ds[:5] == [4] * 5 and tail_ok and k == 10 + n2
                is_k33_shape = ds[:6] == [3] * 6 and all(d in (0, 2) for d in ds[6:]) and k == 9 + n2
                if not (is_k5_shape or is_k33_shape):
                    continue
                keep = [v for v in self.vertices if deg[v] > 0]
                sub = Graph(keep, [(u, v) for (kk, u, v) in self.edges if kk in Sset], False, True)
                if not sub.edges_connected():
                    continue
                core = _suppress_degree2(sub)
                if core is None:
                    continue
                # the core must be simple: no loops, no parallel edges
                if any(u == v for _, u, v in core.edges):
                    continue
                if any(len(core.edge_between(u, v)) > 1 for u in core.vertices for v in core.neighbours(u)):
                    continue
                cds = sorted(core.degree(v) for v in core.vertices)
                if core.n() == 5 and core.m() == 10 and cds == [4] * 5:
                    return "K5"
                if core.n() == 6 and core.m() == 9 and cds == [3] * 6 and core.is_bipartite():
                    return "K3,3"
        return None

    def crossings_of(self, pos):
        """Proper crossings in the straight-line drawing pos: {v: (x, y)}."""
        es = [(u, v) for (_, u, v) in self.edges if u != v]
        cnt = 0
        for i in range(len(es)):
            for j in range(i + 1, len(es)):
                a, b, c, d = *es[i], *es[j]
                if len({a, b, c, d}) < 4:
                    continue
                if _segments_cross(pos[a], pos[b], pos[c], pos[d]):
                    cnt += 1
        return cnt

    def faces_of(self, cyclic_order):
        """Face walks of a plane embedding given as a rotation system
        cyclic_order[v] = neighbours of v in clockwise order."""
        visited, faces = set(), []
        for u in self.vertices:
            for w in cyclic_order[u]:
                if (u, w) in visited:
                    continue
                face, x, y = [], u, w
                while (x, y) not in visited:
                    visited.add((x, y))
                    face.append(x)
                    nxt = cyclic_order[x]
                    y = nxt[(nxt.index(y) - 1) % len(nxt)]
                    x, y = y, x
                faces.append(face)
        return faces

    # ── colouring ────────────────────────────────────────────────
    def greedy_colour(self, order):
        """Greedy colouring in the given order. Returns (colours, trace).
        Events: taken(v, w, colour), try(v, colour), assign(v, colour)."""
        colours, trace = {}, []
        for v in order:
            used = {}
            for _, w in self._adj[v]:
                if w in colours:
                    used[colours[w]] = w
                    trace.append(("taken", v, w, colours[w]))
            c = 0
            while c in used:
                trace.append(("try", v, c))
                c += 1
            colours[v] = c
            trace.append(("assign", v, c))
        return colours, trace

    def chromatic_number(self, limit=12):
        """Exact χ by trying k = 1, 2, … with backtracking (n ≤ limit).
        Returns (χ, colouring)."""
        n = self.n()
        assert n <= limit, f"chromatic_number: n ≤ {limit}"
        for k in range(1, n + 1):
            colours = {}
            if self._k_colourable(list(self.vertices), colours, k):
                return k, colours
        return n, {v: i for i, v in enumerate(self.vertices)}

    def _k_colourable(self, vs, colours, k):
        if not vs:
            return True
        v = vs[0]
        for c in range(k):
            if all(colours.get(w) != c for _, w in self._adj[v] if w in colours):
                colours[v] = c
                if self._k_colourable(vs[1:], colours, k):
                    return True
                del colours[v]
        return False

    def chromatic_polynomial(self):
        """Chromatic polynomial by deletion–contraction (exact, sympy)."""
        import sympy as sp
        k = sp.Symbol("k")
        if self.m() == 0:
            return k ** self.n()
        eid, _, _ = self.edges[0]
        return sp.expand(self.delete_edge(eid).chromatic_polynomial()
                         - self.contract_edge(eid).chromatic_polynomial())

    def bipartition(self):
        """BFS 2-colouring. Returns (parts_or_None, odd_cycle_or_None); the odd
        cycle is the tree path between the conflicting pair plus the edge."""
        colour, parent = {}, {}
        for s in self.vertices:
            if s in colour:
                continue
            colour[s] = 0
            parent[s] = None
            q = [s]
            while q:
                u = q.pop(0)
                for _, w in self._adj[u]:
                    if w not in colour:
                        colour[w] = 1 - colour[u]
                        parent[w] = u
                        q.append(w)
                    elif colour[w] == colour[u]:
                        # tree path w → lca(u, w) → u, plus edge (u, w): an odd cycle
                        path_u = [u]
                        while parent[path_u[-1]] is not None:
                            path_u.append(parent[path_u[-1]])
                        pset = {x: i for i, x in enumerate(path_u)}
                        pw = [w]
                        while pw[-1] not in pset:
                            pw.append(parent[pw[-1]])
                        j = pset[pw[-1]]
                        cycle = pw + path_u[:j][::-1]  # w … m … u; edge (u, w) closes it
                        return None, cycle
        left = [v for v in self.vertices if colour[v] == 0]
        right = [v for v in self.vertices if colour[v] == 1]
        return (left, right), None

    def is_bipartite(self):
        return self.bipartition()[0] is not None

    def konig_edge_colouring(self):
        """Kőnig's line-colouring theorem for bipartite graphs: Δ rounds of maximum
        matchings. Returns (edge_colours, Δ) or None if not bipartite."""
        parts, odd = self.bipartition()
        if parts is None:
            return None
        left, right = parts
        delta = max((self.degree(v) for v in self.vertices), default=0)
        if delta == 0:
            return {}, 0
        colours = {}
        remaining = list(self.edges)
        for c in range(delta):
            sub = Graph(self.vertices, [(u, v) for (k, u, v) in remaining], False, False)
            _, match_l, _ = sub.hopcroft_karp(left, right)
            for u, w in match_l.items():
                eid = sub.edge_between(u, w)[0]
                colours[eid] = c
            remaining = [e for e in remaining if e[0] not in colours]
        assert not remaining, "König rounds left edges uncoloured"
        return colours, delta

    def edge_chromatic_number(self, limit=10):
        """χ′ exactly by search for n ≤ limit; ("vizing", Δ, Δ+1) otherwise."""
        n = self.n()
        delta = max((self.degree(v) for v in self.vertices), default=0)
        if n <= limit:
            for k in range(delta, n + 1):
                if self._k_edge_colourable([e[0] for e in self.edges], {}, k):
                    return k
            return n
        return ("vizing", delta, delta + 1)

    def _k_edge_colourable(self, eids, colours, k):
        if not eids:
            return True
        eid = eids[0]
        u, v = next((e[1], e[2]) for e in self.edges if e[0] == eid)
        for c in range(k):
            if all(colours.get(e[0]) != c for e in self.edges
                   if e[0] in colours and (u in (e[1], e[2]) or v in (e[1], e[2]))):
                colours[eid] = c
                if self._k_edge_colourable(eids[1:], colours, k):
                    return True
                del colours[eid]
        return False

    # ── matchings and covers ─────────────────────────────────────
    def max_matching(self):
        """Maximum matching. Bipartite graphs: augmenting paths (Kuhn) with a
        trace. General graphs: exact branch-and-bound for n ≤ 12 (blossoms),
        augmenting paths otherwise. Returns (matching_edges, trace)."""
        assert not self.directed
        if not self.is_bipartite() and self.n() <= 12:
            edges = self._max_matching_exact()
            return sorted(edges, key=lambda e: (str(e[0]), str(e[1]))), [("done", edges)]
        match, trace = {}, []

        def find_aug(v, seen):
            for _, w in self._adj[v]:
                if w in seen:
                    continue
                seen.add(w)
                if w not in match or find_aug(match[w], seen):
                    match[w] = v
                    match[v] = w
                    return True
            return False

        for v in self.vertices:
            if v in match:
                continue
            if find_aug(v, set()):
                trace.append(("augment", v, match[v]))
            else:
                trace.append(("no_augmenting_path", v))
        edges = sorted({tuple(sorted((u, w), key=str)) for u, w in match.items()},
                       key=lambda e: (str(e[0]), str(e[1])))
        return edges, trace

    def _max_matching_exact(self):
        """Exact maximum matching by branch and bound (n ≤ 12)."""
        best = [0, []]
        es = list(self.edges)

        def go(i, used, chosen):
            if i == len(es) or len(chosen) + (len(es) - i) <= best[0]:
                if i == len(es) and len(chosen) > best[0]:
                    best[0] = len(chosen)
                    best[1] = list(chosen)
                return
            _, u, v = es[i]
            if u not in used and v not in used:
                go(i + 1, used | {u, v}, chosen + [(u, v)])
            go(i + 1, used, chosen)

        go(0, set(), [])
        return best[1]

    def hopcroft_karp(self, left, right):
        """Hopcroft–Karp on the bipartite graph with the given parts.
        Returns (size, match_left, trace). Events: augment(u, w)."""
        match_l, match_r, trace = {}, {}, []
        dist = {}

        def bfs():
            q = []
            for u in left:
                if u not in match_l:
                    dist[u] = 0
                    q.append(u)
                else:
                    dist[u] = math.inf
            found = False
            qi = 0
            while qi < len(q):
                u = q[qi]
                qi += 1
                for _, w in self._adj[u]:
                    if w in match_r:
                        if dist.get(match_r[w], math.inf) == math.inf:
                            dist[match_r[w]] = dist[u] + 1
                            q.append(match_r[w])
                    else:
                        found = True
            return found

        def dfs(u):
            for _, w in self._adj[u]:
                if w not in match_r or (dist.get(match_r[w], math.inf) == dist.get(u, math.inf) + 1 and dfs(match_r[w])):
                    match_l[u] = w
                    match_r[w] = u
                    return True
            dist[u] = math.inf
            return False

        while bfs():
            for u in left:
                if u not in match_l and dfs(u):
                    trace.append(("augment", u, match_l[u]))
        return len(match_l), match_l, trace

    def count_perfect_matchings(self):
        """Number of perfect matchings (brute force; n even)."""
        assert self.n() % 2 == 0
        cnt = 0

        def go(remaining):
            nonlocal cnt
            if not remaining:
                cnt += 1
                return
            v = remaining[0]
            for w in remaining[1:]:
                if self.has_edge(v, w):
                    go([x for x in remaining if x not in (v, w)])

        go(list(self.vertices))
        return cnt

    def min_vertex_cover(self, limit=14):
        """Exact min vertex cover, branch and bound, n ≤ limit."""
        assert self.n() <= limit
        best = [self.n()]

        def go(rem_edges, k):
            if k >= best[0]:
                return
            if not rem_edges:
                best[0] = k
                return
            e = rem_edges[0]
            for v in (e[1], e[2]):
                go([x for x in rem_edges if v not in (x[1], x[2])], k + 1)

        go(list(self.edges), 0)
        return best[0]

    def max_independent_set(self, limit=14):
        return self.n() - self.min_vertex_cover(limit)

    def min_edge_cover(self):
        """n − ν for graphs without isolated vertices."""
        assert all(self.degree(v) > 0 for v in self.vertices)
        return self.n() - len(self.max_matching()[0])

    def max_clique(self, limit=14):
        """Exact maximum clique, branch and bound, n ≤ limit."""
        assert self.n() <= limit
        best = [0]

        def go(cand, size):
            if size + len(cand) <= best[0]:
                return
            if not cand:
                best[0] = max(best[0], size)
                return
            v = cand[0]
            go([w for w in cand[1:] if self.has_edge(v, w)], size + 1)
            go(cand[1:], size)

        go(list(self.vertices), 0)
        return best[0]

    def konig_identity_ok(self):
        """Kőnig: bipartite ⇒ ν = τ."""
        if not self.is_bipartite():
            return None
        return len(self.max_matching()[0]) == self.min_vertex_cover()

    def gallai_identity_ok(self):
        """Gallai: α + τ = n."""
        return self.max_independent_set() + self.min_vertex_cover() == self.n()

    def hall_violator(self, left):
        """A subset S ⊆ left with |N(S)| < |S|, or None if Hall holds."""
        for k in range(1, len(left) + 1):
            for S in itertools.combinations(left, k):
                nb = {w for v in S for _, w in self._adj[v]}
                if len(nb) < k:
                    return set(S)
        return None

    # ── degree sequences ─────────────────────────────────────────
    @staticmethod
    def havel_hakimi(seq):
        """Returns (is_graphic, trace). Events: step(seq, d, targets)."""
        seq = list(seq)
        trace = []
        while True:
            seq = sorted(seq, reverse=True)
            if not seq:
                return True, trace
            d = seq[0]
            if d == 0:
                return all(x == 0 for x in seq), trace
            rest = seq[1:]
            if d < 0 or d > len(rest):
                return False, trace
            trace.append(("step", list(seq), d, rest[:d]))
            seq = [rest[i] - 1 if i < d else rest[i] for i in range(len(rest))]

    @classmethod
    def is_graphic(cls, seq):
        return cls.havel_hakimi(seq)[0]


def _suppress_degree2(g):
    """Suppress all degree-2 vertices of a multigraph (splice their neighbours).
    Returns the core Graph, or None if the splice degenerates."""
    h = Graph(list(g.vertices), [(u, v, i) for i, (_, u, v) in enumerate(g.edges)], g.directed, True)
    changed = True
    while changed and h.n() > 2:
        changed = False
        for v in list(h.vertices):
            if h.degree(v) == 2:
                nbs = [o for _, o in h._adj[v]]
                if len(nbs) != 2 or nbs[0] == nbs[1]:
                    return None
                a, b = nbs
                h = h.delete_vertex(v)
                h = Graph(h.vertices, [(u, w, k) for (k, u, w) in h.edges] + [(a, b, ("splice", v))], False, True)
                changed = True
                break
    return h


# ── Named graphs ─────────────────────────────────────────────────
def K(n):
    return Graph(list(range(n)), list(itertools.combinations(range(n), 2)))


def C(n):
    return Graph(list(range(n)), [(i, (i + 1) % n) for i in range(n)])


def P(n):
    return Graph(list(range(n)), [(i, i + 1) for i in range(n - 1)])


def W(n):
    """Wheel on n vertices: C_{n-1} plus a hub joined to all."""
    g = C(n - 1)
    hub = n - 1
    return Graph(g.vertices + [hub], [(u, v) for (_, u, v) in g.edges] + [(hub, i) for i in range(n - 1)])


def Kmn(m, n):
    return Graph([(0, i) for i in range(m)] + [(1, j) for j in range(n)],
                 [((0, i), (1, j)) for i in range(m) for j in range(n)])


def Q(n):
    """Hypercube Q_n: vertices are n-bit strings, edges flip one bit."""
    verts = [format(i, f"0{n}b") for i in range(2 ** n)]
    edges = []
    for i in range(2 ** n):
        for b in range(n):
            j = i ^ (1 << b)
            if i < j:
                edges.append((format(i, f"0{n}b"), format(j, f"0{n}b")))
    return Graph(verts, edges)


def petersen():
    """Outer 5-cycle 0..4, inner star 5..9 (i to i+2 mod 5), spokes i–(5+i)."""
    return Graph(list(range(10)),
                 [(i, (i + 1) % 5) for i in range(5)]
                 + [(5 + i, 5 + (i + 2) % 5) for i in range(5)]
                 + [(i, 5 + i) for i in range(5)])


def grid(r, c):
    verts = [(i, j) for i in range(r) for j in range(c)]
    edges = []
    for i in range(r):
        for j in range(c):
            if j + 1 < c:
                edges.append(((i, j), (i, j + 1)))
            if i + 1 < r:
                edges.append(((i, j), (i + 1, j)))
    return Graph(verts, edges)


# Dodecahedron (20 vertices, 30 edges, 3-regular, planar) as a fixed edge list.
_DODECAHEDRON_EDGES = [(0, 1), (0, 10), (0, 19), (1, 2), (1, 8), (2, 3), (2, 6), (3, 4), (3, 19),
                       (4, 5), (4, 17), (5, 6), (5, 15), (6, 7), (7, 8), (7, 14), (8, 9), (9, 10),
                       (9, 13), (10, 11), (11, 12), (11, 18), (12, 13), (12, 16), (13, 14), (14, 15),
                       (15, 16), (16, 17), (17, 18), (18, 19)]


def dodecahedron():
    return Graph(list(range(20)), _DODECAHEDRON_EDGES)


def crown(n):
    """Crown graph: K_{n,n} minus the perfect matching (0,i)–(1,i)."""
    g = Kmn(n, n)
    return Graph(g.vertices, [(u, v) for (_, u, v) in g.edges if u[1] != v[1]])


# ── PYQ graphs: one builder per dm PYQ that has a graph, named by PYQ id.
# Each is re-laid-out from its figure's description — our own drawing, nothing copied.
def pyq_cse_1998_b_62_b():
    """Relation digraph: 3-cycle a→b→c→a and 5-cycle d→e→f→g→h→d."""
    return Graph(list("abcdefgh"), [("a", "b"), ("b", "c"), ("c", "a"),
                                    ("d", "e"), ("e", "f"), ("f", "g"), ("g", "h"), ("h", "d")],
                 directed=True)


def pyq_cse_1999_a_15():
    """Articulation-points PYQ: vertices 1–7, edges 12 13 23 24 35 36 56 57."""
    return Graph(range(1, 8), [(1, 2), (1, 3), (2, 3), (2, 4), (3, 5), (3, 6), (5, 6), (5, 7)])


def pyq_cse_1999_b_53():
    """Cut PYQ: vertices A–F, edges AB AD AE AF BC BD CF DE DF EF."""
    return Graph(list("ABCDEF"), [("A", "B"), ("A", "D"), ("A", "E"), ("A", "F"), ("B", "C"),
                                  ("B", "D"), ("C", "F"), ("D", "E"), ("D", "F"), ("E", "F")])


def pyq_cse_2004_cs_77():
    """Colouring PYQ: L, R, T, B around an inner 4-cycle i1-i2-i3-i4;
    L,R join T,B and their side's inner vertices; T joins the two upper, B the two lower."""
    return Graph(["L", "R", "T", "B", "i1", "i2", "i3", "i4"],
                 [("L", "T"), ("L", "B"), ("L", "i1"), ("L", "i4"),
                  ("R", "T"), ("R", "B"), ("R", "i2"), ("R", "i3"),
                  ("T", "i1"), ("T", "i2"), ("B", "i3"), ("B", "i4"),
                  ("i1", "i2"), ("i2", "i3"), ("i3", "i4"), ("i4", "i1")])


def pyq_cse_2005_cs_47():
    """Planarity PYQ: returns {"G1".."G4"}."""
    g1 = Graph(["tl", "tr", "r", "br", "bl", "l"],
               [("tl", "tr"), ("tr", "r"), ("r", "br"), ("br", "bl"), ("bl", "l"), ("l", "tl"),
                ("l", "r"), ("tl", "br"), ("tr", "bl")])
    g2 = Graph(["top", "ur", "lr", "bot", "ll", "ul"],
               [("top", "ur"), ("ur", "lr"), ("lr", "bot"), ("bot", "ll"), ("ll", "ul"), ("ul", "top"),
                ("ul", "ur"), ("ll", "lr"), ("top", "bot"), ("top", "ll"), ("ur", "bot")])
    g3 = Graph(["top", "ur", "lr", "ll", "ul"],
               [("top", "ur"), ("ur", "lr"), ("lr", "ll"), ("ll", "ul"), ("ul", "top"),
                ("ul", "ur"), ("ul", "lr"), ("ur", "ll")])
    g4 = Graph(["top", "ur", "lr", "ll", "ul"],
               [("top", "ur"), ("ur", "lr"), ("lr", "ll"), ("ll", "ul"), ("ul", "top"),
                ("top", "ll"), ("top", "lr"), ("ul", "lr"), ("ur", "ll")])
    return {"G1": g1, "G2": g2, "G3": g3, "G4": g4}


def pyq_cse_2012_cs_26():
    """Isomorphism PYQ: main graph + options A–D. Returns {"main","A","B","C","D"}.
    Main: centre c on a 5-cycle c-p-q-r-s-c, pendant on c, path c-t-u."""
    main = Graph(["c", "pend", "p", "q", "r", "s", "t", "u"],
                 [("c", "pend"), ("c", "p"), ("p", "q"), ("q", "r"), ("r", "s"), ("s", "c"),
                  ("c", "t"), ("t", "u")])
    optA = Graph(["c", "x", "y", "pend", "t", "u", "v", "w"],
                 [("c", "x"), ("x", "y"), ("y", "c"), ("x", "pend"), ("c", "t"), ("t", "u"),
                  ("y", "v"), ("v", "w")])
    optB = Graph(["c", "pend", "p", "q", "r", "s", "t", "u"],
                 [("c", "pend"), ("c", "p"), ("p", "q"), ("q", "r"), ("r", "s"), ("s", "c"),
                  ("c", "t"), ("t", "u")])
    optC = Graph(["c", "p", "q", "r", "s", "pend", "t", "u"],
                 [("c", "p"), ("p", "q"), ("q", "r"), ("r", "s"), ("s", "c"), ("p", "pend"),
                  ("c", "t"), ("t", "u")])
    optD = Graph(["c", "a", "b", "d", "pend", "t", "u", "v"],
                 [("c", "a"), ("a", "b"), ("b", "d"), ("d", "c"), ("c", "pend"),
                  ("c", "t"), ("t", "u"), ("a", "v")])
    return {"main": main, "A": optA, "B": optB, "C": optC, "D": optD}


def pyq_cse_2018_cs_18():
    """Chromatic-number PYQ: vertices a–f, edges ae ab ac ce cd cb bd bf df ef."""
    return Graph(list("abcdef"), [("a", "e"), ("a", "b"), ("a", "c"), ("c", "e"), ("c", "d"),
                                  ("c", "b"), ("b", "d"), ("b", "f"), ("d", "f"), ("e", "f")])


def pyq_it_2008_it_3():
    """3×3 grid graph plus one extra edge top-left to bottom-right."""
    g = grid(3, 3).relabel({(i, j): f"{i}{j}" for i in range(3) for j in range(3)})
    return Graph([f"{i}{j}" for i in range(3) for j in range(3)],
                 [(u, v) for (_, u, v) in g.edges] + [("00", "22")])


def pyq_cse_2022_cs_40_optC():
    """Petersen PYQ, option (C): 9-cycle v0..v8 plus centre c; extra edges
    c-v0, c-v3, c-v6, v1-v5, v2-v7, v8-v4 (cubic, 10 vertices, 15 edges)."""
    verts = [f"v{i}" for i in range(9)] + ["c"]
    edges = [(f"v{i}", f"v{(i + 1) % 9}") for i in range(9)]
    edges += [("c", "v0"), ("c", "v3"), ("c", "v6"), ("v1", "v5"), ("v2", "v7"), ("v8", "v4")]
    return Graph(verts, edges)


def pyq_cse_2024_2_cs_50():
    """Chromatic-number PYQ: 8 octagon vertices v0..v7 (clockwise from top-left);
    8 sides, chords v7-v2, v6-v3, v0-v5, v1-v4, v0-v3, v1-v6, v7-v4, v2-v5 (4-regular)."""
    verts = [f"v{i}" for i in range(8)]
    edges = [(f"v{i}", f"v{(i + 1) % 8}") for i in range(8)]
    edges += [("v7", "v2"), ("v6", "v3"), ("v0", "v5"), ("v1", "v4"),
              ("v0", "v3"), ("v1", "v6"), ("v7", "v4"), ("v2", "v5")]
    return Graph(verts, edges)


# ── Counting ─────────────────────────────────────────────────────
def labelled_graphs_with_k_edges(n, k):
    return math.comb(math.comb(n, 2), k)


def perfect_matchings_K2n(n):
    """Perfect matchings of K_{2n}: (2n−1)!!"""
    return math.prod(range(1, 2 * n, 2))


def matchings_Pn(n):
    """Matchings of the path P_n: F_{n+1} (Fibonacci)."""
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def hamiltonian_cycles_Kn(n):
    return math.factorial(n - 1) // 2 if n >= 3 else 0


def spanning_trees_Kn_with_fixed_edge(n):
    """Spanning trees of K_n containing a fixed edge: 2·n^{n−3}."""
    return 2 * n ** (n - 3) if n >= 2 else 0


if __name__ == "__main__":
    # Light self-check so run_checks.py exercises the module directly.
    assert K(4).spanning_tree_count() == 16
    assert petersen().chromatic_number()[0] == 3
    assert Q(3).vertex_connectivity() == 3
    tree = Graph([0, 1, 2, 3, 4, 5], [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5)])
    seq, _ = tree.prufer_encode()
    g, _ = Graph.prufer_decode(seq)
    assert g.isomorphic(tree)[0] is not None
    assert Graph.havel_hakimi([3, 3, 3, 3])[0]
    assert not Graph.havel_hakimi([3, 3, 3, 1])[0]
    print("graphlib self-check ok")
