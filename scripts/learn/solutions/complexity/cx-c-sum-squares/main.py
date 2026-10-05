import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
t = int(data[0])
# Python integers are unbounded: divide exactly, then reduce
print('\n'.join(str(n * (n + 1) * (2 * n + 1) // 6 % MOD) for n in map(int, data[1:1 + t])))
