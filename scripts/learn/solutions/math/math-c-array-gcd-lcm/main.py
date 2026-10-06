import sys
data = sys.stdin.buffer.read().split()
from math import gcd
CAP = 10 ** 18
n = int(data[0])
g, l = 0, 1
for x in map(int, data[1:1 + n]):
    g = gcd(g, x)
    if l != -1:
        q = l // gcd(l, x)
        l = -1 if q > CAP // x else q * x     # once over the cap, it stays over
print(g)
print(l)
