import sys
data = sys.stdin.buffer.read().split()
from math import gcd
t = int(data[0])
out = []
for i in range(t):
    p, q = int(data[1 + 2 * i]), int(data[2 + 2 * i])
    g = gcd(p, q)                     # math.gcd works on absolute values
    p, q = p // g, q // g
    if q < 0:
        p, q = -p, -q
    out.append(f"{p}/{q}")
print('\n'.join(out))
