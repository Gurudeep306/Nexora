import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
print(n * (n + 1) // 2 - sum(map(int, data[1:1 + n])))   # expected minus actual
