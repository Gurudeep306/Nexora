import sys
data = sys.stdin.buffer.read().split()
from math import gcd
t = int(data[0])
v = list(map(int, data[1:1 + 3 * t]))
out = []
for i in range(0, 3 * t, 3):
    n, a, b = v[i], v[i + 1], v[i + 2]
    out.append(n // a + n // b - n // (a // gcd(a, b) * b))
print('\n'.join(map(str, out)))
