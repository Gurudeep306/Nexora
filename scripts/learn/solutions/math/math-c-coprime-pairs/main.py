import sys
data = sys.stdin.buffer.read().split()
from itertools import accumulate

q = int(data[0])
ns = list(map(int, data[1:1 + q]))
N = max(ns)
phi = list(range(N + 1))
for p in range(2, N + 1):
    if phi[p] == p:                                       # untouched => prime
        phi[p::p] = [v - v // p for v in phi[p::p]]       # whole slice at once
pre = list(accumulate(phi))
sys.stdout.write('\n'.join(str(2 * pre[n] - 1) for n in ns) + '\n')
