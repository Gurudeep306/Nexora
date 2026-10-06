import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
M = max(a)
# linear sieve for the Möbius function
mu = [0] * (M + 1)
mu[1] = 1
comp = bytearray(M + 1)
primes = []
for i in range(2, M + 1):
    if not comp[i]:
        primes.append(i)
        mu[i] = -1
    for p in primes:
        if i * p > M:
            break
        comp[i * p] = 1
        if i % p == 0:
            break                              # mu[i*p] stays 0 (square factor)
        mu[i * p] = -mu[i]
freq = [0] * (M + 1)
for x in a:
    freq[x] += 1
ans = 0
for d in range(1, M + 1):
    if mu[d]:
        c = sum(freq[d::d])                    # values divisible by d
        ans += mu[d] * (c * (c - 1) // 2)
print(ans)
