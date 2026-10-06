import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
INV4 = pow(4, MOD - 2, MOD)
t = int(data[0])
# each of the C(n, 2) pairs is inverted with probability 1/2
print('\n'.join(str(int(x) % MOD * ((int(x) - 1) % MOD) % MOD * INV4 % MOD) for x in data[1:1 + t]))
