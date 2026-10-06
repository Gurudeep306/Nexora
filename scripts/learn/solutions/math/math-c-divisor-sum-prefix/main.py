import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
n = int(data[0])
total, d = 0, 1
while d <= n:
    q = n // d
    e = n // q                            # all d' in [d, e] share quotient q
    total += q * ((d + e) * (e - d + 1) // 2)
    d = e + 1
print(total % MOD)
