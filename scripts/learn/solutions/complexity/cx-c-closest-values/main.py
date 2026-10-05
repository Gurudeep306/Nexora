import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = sorted(map(int, data[1:n + 1]))
print(min(y - x for x, y in zip(a, a[1:])))   # only neighbours can be closest
