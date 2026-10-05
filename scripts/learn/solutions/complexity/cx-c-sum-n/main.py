import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
t = int(data[0])
print('\n'.join(str(n * (n + 1) // 2 % MOD) for n in map(int, data[1:1 + t])))
