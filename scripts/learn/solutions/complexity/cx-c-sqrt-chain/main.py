import sys
data = sys.stdin.buffer.read().split()
from math import isqrt          # exact integer square root
t = int(data[0])
out = []
for n in map(int, data[1:1 + t]):
    c = 0
    while n >= 2:
        n = isqrt(n)
        c += 1
    out.append(c)
print('\n'.join(map(str, out)))
