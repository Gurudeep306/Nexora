import sys
data = sys.stdin.buffer.read().split()

# primes up to 10^6 = sqrt(10^12): trial division only needs these
LIM = 10 ** 6
sieve = bytearray([1]) * (LIM + 1)
sieve[0] = sieve[1] = 0
for i in range(2, int(LIM ** 0.5) + 1):
    if sieve[i]:
        sieve[i * i::i] = bytearray(len(range(i * i, LIM + 1, i)))
primes = [i for i in range(LIM + 1) if sieve[i]]

t = int(data[0])
out = []
for tok in data[1:1 + t]:
    n = int(tok)
    parts = []
    for p in primes:
        if p * p > n:
            break
        if n % p == 0:
            e = 0
            while n % p == 0:
                n //= p
                e += 1
            parts.append(f"{p}^{e}")
    if n > 1:
        parts.append(f"{n}^1")            # leftover is prime
    out.append(' '.join(parts))
print('\n'.join(out))
