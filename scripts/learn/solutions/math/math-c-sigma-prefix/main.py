import sys
data = sys.stdin.buffer.read().split()
from math import isqrt

M = 10**9 + 7
n = int(data[0])
r = isqrt(n)
s = 0
for i in range(1, r + 1):
    q = n // i
    s += i * q + q * (q + 1) // 2          # exact big ints; reduce once at the end
s -= r * (r * (r + 1) // 2)                # the r x r square was counted twice
print(s % M)
