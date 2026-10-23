"""Graph theory for the Discrete Mathematics checks (Chapter 8) and the Graph Playground.

Self-contained brute-force implementations on small graphs (vertices 0..n-1, undirected simple edges as
frozensets), so the checks do not depend on any package; when networkx is installed the main
functions are cross-checked against it (`crosscheck`).
"""
import itertools
import math
from collections import deque
from fractions import Fraction


class Graph:
    def __init__(self, n, edges=(), labels=None):
        self.n = n
        self.E = {frozenset(e) for e in edges if len(set(e)) == 2}
        self.labels = labels or [str(i) for i in range(n)]

    @property
    def m(self):
        return len(self.E)

    def adj(self, v):
        return sorted(u for e in self.E if v in e for u in e if u != v)

    def deg(self, v):
        return sum(1 for e in self.E if v in e)

    def degrees(self):
        return [self.deg(v) for v in range(self.n)]

    def degree_sequence(self):
        return sorted(self.degrees(), reverse=True)

    def edges(self):
        return sorted(tuple(sorted(e)) for e in self.E)

    def has(self, u, v):
        return frozenset((u, v)) in self.E

    def complement(self):
        return Graph(self.n, [(u, v) for u, v in itertools.combinations(range(self.n), 2) if not self.has(u, v)], self.labels)

    def remove_vertex(self, v):
        keep = [u for u in range(self.n) if u != v]
        idx = {u: i for i, u in enumerate(keep)}
        return Graph(self.n - 1, [(idx[a], idx[b]) for a, b in self.edges() if v not in (a, b)], [self.labels[u] for u in keep])

    def remove_edge(self, u, v):
        return Graph(self.n, [e for e in self.edges() if set(e) != {u, v}], self.labels)

    def components(self):
        seen, comps = set(), []
        for s in range(self.n):
            if s in seen:
                continue
            comp, q = [], deque([s])
            seen.add(s)
            while q:
                v = q.popleft()
                comp.append(v)
                for u in self.adj(v):
                    if u not in seen:
                        seen.add(u)
                        q.append(u)
            comps.append(sorted(comp))
        return comps

    def connected(self):
        return self.n <= 1 or len(self.components()) == 1

    def distances(self, s):
        d = {s: 0}
        q = deque([s])
        while q:
            v = q.popleft()
            for u in self.adj(v):
                if u not in d:
                    d[u] = d[v] + 1
                    q.append(u)
        return d

    def diameter(self):
        if not self.connected():
            return math.inf
        return max(max(self.distances(s).values()) for s in range(self.n))

    def square(self):
        return Graph(self.n, [(u, v) for u, v in itertools.combinations(range(self.n), 2) if self.distances(u).get(v, 99) <= 2], self.labels)

    def cut_vertices(self):
        k = len(self.components())
        return [v for v in range(self.n) if len(self.remove_vertex(v).components()) > k - (1 if self.deg(v) == 0 else 0)]

    def bridges(self):
        k = len(self.components())
        return [e for e in self.edges() if len(self.remove_edge(*e).components()) > k]

    def bipartition(self):
        """(True, colouring) or (False, an odd cycle as a vertex list)."""
        col = {}
        parent = {}
        for s in range(self.n):
            if s in col:
                continue
            col[s], parent[s] = 0, None
            q = deque([s])
            while q:
                v = q.popleft()
                for u in self.adj(v):
                    if u not in col:
                        col[u], parent[u] = 1 - col[v], v
                        q.append(u)
                    elif col[u] == col[v]:
                        def path(x):
                            p = [x]
                            while parent[p[-1]] is not None:
                                p.append(parent[p[-1]])
                            return p
                        a, b = path(v), path(u)
                        common = next(x for x in a if x in b)
                        cyc = a[:a.index(common) + 1] + b[:b.index(common)][::-1]
                        return False, cyc
        return True, [col[v] for v in range(self.n)]

    def bipartite(self):
        return self.bipartition()[0]

    def greedy_colouring(self, order=None):
        order = list(range(self.n)) if order is None else list(order)
        col = {}
        for v in order:
            used = {col[u] for u in self.adj(v) if u in col}
            col[v] = next(c for c in itertools.count() if c not in used)
        return [col[v] for v in range(self.n)]

    def colourable(self, k):
        return self.colouring(k) is not None

    def colouring(self, k):
        """A proper k-colouring found by backtracking (highest degree first), or None."""
        order = sorted(range(self.n), key=lambda v: -self.deg(v))
        col = {}

        def bt(i):
            if i == len(order):
                return True
            v = order[i]
            for c in range(k):
                if all(col.get(u) != c for u in self.adj(v)):
                    col[v] = c
                    if bt(i + 1):
                        return True
                    del col[v]
            return False
        return [col[v] for v in range(self.n)] if bt(0) else None

    def chromatic_number(self):
        if self.n == 0:
            return 0
        return next(k for k in range(1, self.n + 1) if self.colourable(k))

    def chromatic_index(self):
        if not self.E:
            return 0
        L = self.line_graph()
        return L.chromatic_number()

    def line_graph(self):
        es = self.edges()
        return Graph(len(es), [(i, j) for i, j in itertools.combinations(range(len(es)), 2) if set(es[i]) & set(es[j])],
                     [f"{self.labels[a]}{self.labels[b]}" for a, b in es])

    def clique_number(self):
        best = 1 if self.n else 0
        for r in range(2, self.n + 1):
            if any(all(self.has(u, v) for u, v in itertools.combinations(S, 2)) for S in itertools.combinations(range(self.n), r)):
                best = r
            else:
                break
        return best

    def independence_number(self):
        return self.complement().clique_number() if self.n else 0

    def min_vertex_cover(self):
        for r in range(self.n + 1):
            for S in itertools.combinations(range(self.n), r):
                if all(set(e) & set(S) for e in self.E):
                    return list(S)

    def matchings(self):
        """All matchings (including the empty one) as lists of edges."""
        es = self.edges()
        out = []

        def rec(i, used, cur):
            if i == len(es):
                out.append(list(cur))
                return
            rec(i + 1, used, cur)
            a, b = es[i]
            if a not in used and b not in used:
                cur.append(es[i])
                rec(i + 1, used | {a, b}, cur)
                cur.pop()
        rec(0, frozenset(), [])
        return out

    def matching_number(self):
        return max(len(M) for M in self.matchings())

    def perfect_matchings(self):
        return sum(1 for M in self.matchings() if 2 * len(M) == self.n)

    def min_edge_cover(self):
        if any(self.deg(v) == 0 for v in range(self.n)):
            return None
        return self.n - self.matching_number()

    def maximal_independent_sets(self):
        out = []
        for r in range(self.n + 1):
            for S in itertools.combinations(range(self.n), r):
                s = set(S)
                if any(self.has(u, v) for u, v in itertools.combinations(S, 2)):
                    continue
                if all(v in s or any(self.has(v, u) for u in s) for v in range(self.n)):
                    out.append(S)
        return out

    def euler(self):
        """'circuit' | 'trail' | None for a graph whose edges lie in one component."""
        nz = [v for v in range(self.n) if self.deg(v)]
        if not nz:
            return "circuit"
        sub = Graph(self.n, self.edges())
        comps = [c for c in sub.components() if any(self.deg(v) for v in c)]
        if len(comps) > 1:
            return None
        odd = sum(1 for v in nz if self.deg(v) % 2)
        return "circuit" if odd == 0 else "trail" if odd == 2 else None

    def euler_tour(self):
        """Hierholzer: a list of vertices (closed if a circuit), or None."""
        kind = self.euler()
        if kind is None or not self.E:
            return None
        odd = [v for v in range(self.n) if self.deg(v) % 2]
        start = odd[0] if odd else min(v for v in range(self.n) if self.deg(v))
        left = {v: self.adj(v) for v in range(self.n)}
        stack, tour = [start], []
        while stack:
            v = stack[-1]
            if left[v]:
                u = left[v].pop(0)
                left[u].remove(v)
                stack.append(u)
            else:
                tour.append(stack.pop())
        tour.reverse()
        assert len(tour) == self.m + 1
        return tour

    def hamiltonian_cycle(self):
        if self.n < 3:
            return None
        path = [0]

        def bt():
            if len(path) == self.n:
                return self.has(path[-1], 0)
            for u in self.adj(path[-1]):
                if u not in path:
                    path.append(u)
                    if bt():
                        return True
                    path.pop()
            return False
        return list(path) if bt() else None

    def hamiltonian_cycles(self):
        """Number of distinct Hamiltonian cycles (as edge sets)."""
        if self.n < 3:
            return 0
        cnt = 0
        for p in itertools.permutations(range(1, self.n)):
            if p[0] > p[-1]:
                continue
            cyc = (0,) + p
            if all(self.has(cyc[i], cyc[(i + 1) % self.n]) for i in range(self.n)):
                cnt += 1
        return cnt

    def cycles_of_length(self, k):
        """Number of distinct cycles (as edge sets) of length k."""
        cnt = 0
        for S in itertools.combinations(range(self.n), k):
            first = S[0]
            for p in itertools.permutations(S[1:]):
                if p[0] > p[-1]:
                    continue
                cyc = (first,) + p
                if all(self.has(cyc[i], cyc[(i + 1) % k]) for i in range(k)):
                    cnt += 1
        return cnt

    def laplacian(self):
        return [[self.deg(i) if i == j else (-1 if self.has(i, j) else 0) for j in range(self.n)] for i in range(self.n)]

    def spanning_trees(self):
        """Matrix-tree theorem: any cofactor of the Laplacian (exact)."""
        if self.n == 1:
            return 1
        M = [[Fraction(x) for x in row[1:]] for row in self.laplacian()[1:]]
        return int(det(M))

    def spanning_trees_brute(self):
        cnt = 0
        for S in itertools.combinations(self.edges(), self.n - 1):
            if Graph(self.n, S).connected():
                cnt += 1
        return cnt

    def is_tree(self):
        return self.connected() and self.m == self.n - 1

    def adjacency(self):
        return [[1 if self.has(i, j) else 0 for j in range(self.n)] for i in range(self.n)]

    def triangles(self):
        return sum(1 for S in itertools.combinations(range(self.n), 3) if all(self.has(u, v) for u, v in itertools.combinations(S, 2)))

    def planar(self):
        """Planarity via networkx when available, else by searching for a K5 / K3,3 subdivision is not
        attempted: returns None when undecided (the checks only call this with networkx present)."""
        try:
            import networkx as nx
        except ImportError:
            return None
        G = nx.Graph()
        G.add_nodes_from(range(self.n))
        G.add_edges_from(self.edges())
        return nx.check_planarity(G)[0]


def det(M):
    M = [row[:] for row in M]
    n = len(M)
    d = Fraction(1)
    for c in range(n):
        p = next((r for r in range(c, n) if M[r][c] != 0), None)
        if p is None:
            return Fraction(0)
        if p != c:
            M[c], M[p] = M[p], M[c]
            d = -d
        d *= M[c][c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for j in range(c, n):
                M[r][j] -= f * M[c][j]
    return d


def matmul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]


def isomorphic(G, H):
    if G.n != H.n or G.m != H.m or G.degree_sequence() != H.degree_sequence():
        return False
    for p in itertools.permutations(range(G.n)):
        if all(H.has(p[a], p[b]) for a, b in G.edges()):
            return True
    return False


def havel_hakimi(seq):
    """(graphic?, the list of reduction steps)."""
    s = sorted(seq, reverse=True)
    steps = [list(s)]
    while s and s[0] > 0:
        d = s.pop(0)
        if d > len(s):
            return False, steps
        for i in range(d):
            s[i] -= 1
            if s[i] < 0:
                return False, steps
        s.sort(reverse=True)
        steps.append(list(s))
    return all(x == 0 for x in s), steps


def graphic_brute(seq):
    n = len(seq)
    pairs = list(itertools.combinations(range(n), 2))
    target = sorted(seq, reverse=True)
    for mask in range(2 ** len(pairs)):
        G = Graph(n, [p for j, p in enumerate(pairs) if mask >> j & 1])
        if G.degree_sequence() == target:
            return True
    return False


def prufer_encode(T):
    T = Graph(T.n, T.edges())
    code = []
    alive = set(range(T.n))
    adj = {v: set(T.adj(v)) for v in range(T.n)}
    for _ in range(T.n - 2):
        leaf = min(v for v in alive if len(adj[v]) == 1)
        nb = next(iter(adj[leaf]))
        code.append(nb)
        adj[nb].discard(leaf)
        adj[leaf] = set()
        alive.discard(leaf)
    return code


def prufer_decode(code):
    n = len(code) + 2
    deg = [1] * n
    for x in code:
        deg[x] += 1
    edges = []
    for x in code:
        leaf = min(v for v in range(n) if deg[v] == 1)
        edges.append((leaf, x))
        deg[leaf] -= 1
        deg[x] -= 1
    u, v = [w for w in range(n) if deg[w] == 1]
    edges.append((u, v))
    return Graph(n, edges)


# ── Standard graphs ───────────────────────────────────────────────────────

def K(n):
    return Graph(n, itertools.combinations(range(n), 2))


def C(n):
    return Graph(n, [(i, (i + 1) % n) for i in range(n)])


def Pn(n):
    return Graph(n, [(i, i + 1) for i in range(n - 1)])


def W(n):
    """Wheel with n rim vertices (0..n-1) and hub n."""
    return Graph(n + 1, [(i, (i + 1) % n) for i in range(n)] + [(i, n) for i in range(n)])


def Kmn(m, n):
    return Graph(m + n, [(i, m + j) for i in range(m) for j in range(n)])


def Q(d):
    return Graph(2 ** d, [(u, u ^ (1 << b)) for u in range(2 ** d) for b in range(d) if u < u ^ (1 << b)],
                 [format(u, f"0{d}b") for u in range(2 ** d)])


def petersen():
    outer = [(i, (i + 1) % 5) for i in range(5)]
    spokes = [(i, i + 5) for i in range(5)]
    inner = [(5 + i, 5 + (i + 2) % 5) for i in range(5)]
    return Graph(10, outer + spokes + inner)


def grid(r, c):
    idx = lambda i, j: i * c + j  # noqa: E731
    es = [(idx(i, j), idx(i, j + 1)) for i in range(r) for j in range(c - 1)] + [(idx(i, j), idx(i + 1, j)) for i in range(r - 1) for j in range(c)]
    return Graph(r * c, es)


def crosscheck(G):
    """Compare the brute-force answers with networkx (when installed)."""
    try:
        import networkx as nx
    except ImportError:
        return False
    H = nx.Graph()
    H.add_nodes_from(range(G.n))
    H.add_edges_from(G.edges())
    assert sorted(map(sorted, nx.connected_components(H))) == sorted(G.components())
    assert G.bipartite() == nx.is_bipartite(H)
    assert sorted(nx.articulation_points(H)) == sorted(G.cut_vertices())
    assert sorted(tuple(sorted(e)) for e in nx.bridges(H)) == sorted(G.bridges())
    if G.n <= 10:
        assert len(nx.max_weight_matching(H, maxcardinality=True)) == G.matching_number()
    if nx.is_connected(H) and G.n > 0 and math.comb(G.m, G.n - 1) <= 200000:
        assert G.spanning_trees_brute() == G.spanning_trees()
    return True
