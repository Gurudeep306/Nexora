import sys
from collections import Counter
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


data = sys.stdin.read().split()
n, s = int(data[0]), data[1]
F, IF = build_fact(n)
ans = F[n]
for k in Counter(s).values():
    ans = ans * IF[k] % P        # divide by k_c!
print(ans)
