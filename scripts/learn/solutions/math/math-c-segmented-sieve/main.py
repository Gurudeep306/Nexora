import sys
data = sys.stdin.buffer.read().split()
from math import isqrt

L, R = int(data[0]), int(data[1])
lim = isqrt(R)
small = bytearray([1]) * (lim + 1)
primes = []
for p in range(2, lim + 1):
    if small[p]:
        primes.append(p)
        small[p * p::p] = bytes(len(range(p * p, lim + 1, p)))
size = R - L + 1
seg = bytearray([1]) * size                      # seg[i] <-> L + i
for p in primes:
    s = max(p * p, (L + p - 1) // p * p)
    if s <= R:
        seg[s - L::p] = bytes(len(range(s - L, size, p)))   # cross out in C speed
if L == 1:
    seg[0] = 0
print(seg.count(1))
