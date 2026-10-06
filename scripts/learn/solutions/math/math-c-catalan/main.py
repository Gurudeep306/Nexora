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
q = list(map(int, data[1:1 + t]))
F, IF = build_fact(2 * max(q) + 1)
print('\n'.join(str(F[2 * n] * IF[n] % P * IF[n + 1] % P) for n in q))   # (2n)! / (n! (n+1)!)
