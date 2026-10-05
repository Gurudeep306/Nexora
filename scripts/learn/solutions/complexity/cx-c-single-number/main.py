import sys
data = sys.stdin.buffer.read().split()
from functools import reduce
from operator import xor
n = int(data[0])
print(reduce(xor, map(int, data[1:n + 1]), 0))   # pairs cancel: x ^ x = 0
