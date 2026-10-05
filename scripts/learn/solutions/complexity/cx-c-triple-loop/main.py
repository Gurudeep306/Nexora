import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
print('\n'.join(str(n * (n + 1) * (n + 2) // 6) for n in map(int, data[1:1 + t])))   # C(n+2, 3)
