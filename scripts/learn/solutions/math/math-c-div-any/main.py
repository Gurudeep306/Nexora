import sys
data = sys.stdin.buffer.read().split()
from math import gcd

n, k = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + k]))
total = 0
stack = [(0, 1, 0)]                      # (next index, lcm so far, subset size)
while stack:
    i, l, sz = stack.pop()
    if i == k:
        if sz:
            total += n // l if sz % 2 else -(n // l)
        continue
    stack.append((i + 1, l, sz))         # skip a[i]
    nl = l // gcd(l, a[i]) * a[i]
    if nl <= n:                          # supersets of an lcm > n contribute 0
        stack.append((i + 1, nl, sz + 1))
print(total)
