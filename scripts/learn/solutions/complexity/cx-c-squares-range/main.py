import sys
data = sys.stdin.buffer.read().split()
from math import isqrt          # exact integer square root
t = int(data[0])
v = list(map(int, data[1:1 + 2 * t]))
print('\n'.join(str(isqrt(v[i + 1]) - isqrt(v[i] - 1)) for i in range(0, 2 * t, 2)))
