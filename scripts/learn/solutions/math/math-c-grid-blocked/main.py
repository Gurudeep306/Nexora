import sys
data = sys.stdin.buffer.read().split()
P = 10**9 + 7


def build_fact(N):
    """factorials and inverse factorials up to N"""
    F = [1] * (N + 1)
    for i in range(1, N + 1):
        F[i] = F[i - 1] * i % P
    IF = [1] * (N + 1)
    IF[N] = pow(F[N], P - 2, P)
    for i in range(N, 0, -1):
        IF[i - 1] = IF[i] * i % P
    return F, IF


t = int(data[0])
qs = [tuple(map(int, data[1 + 4 * i:5 + 4 * i])) for i in range(t)]
F, IF = build_fact(max(n + m for n, m, _, _ in qs))


def C(n, r):
    return F[n] * IF[r] % P * IF[n - r] % P


out = []
for n, m, x, y in qs:
    through = C(x + y - 2, x - 1) * C(n - x + m - y, n - x)    # to rock × from rock
    out.append((C(n + m - 2, n - 1) - through) % P)
print('\n'.join(map(str, out)))
