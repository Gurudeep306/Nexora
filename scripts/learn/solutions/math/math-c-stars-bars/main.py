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
qs = [tuple(map(int, data[1 + 3 * i:4 + 3 * i])) for i in range(t)]
N = max([n - k * l + k - 1 for n, k, l in qs] + [1])
F, IF = build_fact(N)
out = []
for n, k, l in qs:
    rest = n - k * l
    out.append(F[rest + k - 1] * IF[k - 1] % P * IF[rest] % P if rest >= 0 else 0)
print('\n'.join(map(str, out)))
