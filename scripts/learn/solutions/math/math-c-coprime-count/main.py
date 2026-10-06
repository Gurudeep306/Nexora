import sys
data = sys.stdin.buffer.read().split()


def distinct_primes(m):
    ps, d = [], 2
    while d * d <= m:
        if m % d == 0:
            ps.append(d)
            while m % d == 0:
                m //= d
        d += 1 if d == 2 else 2
    if m > 1:
        ps.append(m)
    return ps


t = int(data[0])
out = []
for q in range(t):
    n, m = int(data[1 + 2 * q]), int(data[2 + 2 * q])
    ps = distinct_primes(m)
    total = 0
    for mask in range(1 << len(ps)):
        d, bits = 1, 0
        for i, p in enumerate(ps):
            if mask >> i & 1:
                d *= p
                bits += 1
        total += -(n // d) if bits % 2 else n // d   # inclusion-exclusion term
    out.append(str(total))
print('\n'.join(out))
