import sys
data = sys.stdin.buffer.read().split()
from math import isqrt

q = int(data[0])
qs = list(map(int, data[1:1 + q]))
N = max(qs)
is_p = bytearray([1]) * (N + 1)
is_p[0] = 0
if N >= 1:
    is_p[1] = 0
for p in range(2, isqrt(N) + 1):
    if is_p[p]:
        is_p[p * p::p] = bytes(len(range(p * p, N + 1, p)))   # cross out multiples in C speed

# answer offline in increasing n: count flags between consecutive queries
ans = [0] * q
cnt, prev = 0, 0
for i in sorted(range(q), key=qs.__getitem__):
    n = qs[i]
    cnt += is_p.count(1, prev, n + 1)
    prev = n + 1 if n + 1 > prev else prev
    ans[i] = cnt
sys.stdout.write('\n'.join(map(str, ans)) + '\n')
