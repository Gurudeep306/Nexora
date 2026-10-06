import sys
data = sys.stdin.buffer.read().split()
n, m, q = int(data[0]), int(data[1]), int(data[2])
ks = list(map(int, data[3:3 + q]))
ps, mm, d = [], m, 2                       # distinct primes of m
while d * d <= mm:
    if mm % d == 0:
        ps.append(d)
        while mm % d == 0:
            mm //= d
    d += 1
if mm > 1:
    ps.append(mm)
w = len(ps)
unit = [1 % m] * (n + 1)                   # coprime part of C(n, k) mod m
ex = [[0] * (n + 1) for _ in range(w)]     # exponent of each prime in C(n, k)
c = [0] * w
u = 1 % m
for k in range(1, n + 1):
    a, b = n - k + 1, k
    for j in range(w):
        p = ps[j]
        while a % p == 0:
            a //= p
            c[j] += 1
        while b % p == 0:
            b //= p
            c[j] -= 1
        ex[j][k] = c[j]
    u = u * a * pow(b, -1, m) % m if m > 1 else 0   # b is now coprime to m
    unit[k] = u
out = []
for k in ks:
    r = unit[k]
    for j in range(w):
        r = r * pow(ps[j], ex[j][k], m) % m
    out.append(r)
print('\n'.join(map(str, out)))
