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
v = list(map(int, data[1:1 + 2 * t]))
F, IF = build_fact(max(v[0::2] + [1]))
out = []
for i in range(t):
    n, r = v[2 * i], v[2 * i + 1]
    out.append(F[n] * IF[r] % P * IF[n - r] % P if r <= n else 0)
print('\n'.join(map(str, out)))
