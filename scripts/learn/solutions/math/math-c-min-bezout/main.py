import sys
data = sys.stdin.buffer.read().split()

def min_x(a, b, c):
    """Smallest x >= 0 with a*x + b*y = c for some integer y, as (x, y); None if impossible."""
    x0, x1, aa, bb = 1, 0, a, b
    while bb:                                   # iterative extended Euclid
        q = aa // bb
        aa, bb = bb, aa - q * bb
        x0, x1 = x1, x0 - q * x1
    g = aa
    if c % g:
        return None
    m = b // g
    x = x0 % m * (c // g % m) % m
    return x, (c - a * x) // b, g


t = int(data[0])
out = []
for i in range(t):
    a, b, c = (int(v) for v in data[1 + 3 * i: 4 + 3 * i])
    r = min_x(a, b, c)
    if r is None:
        out.append('-1')
        continue
    x1, y1, g = r
    m, n = b // g, a // g                       # x = x1 + k*m, y = y1 - k*n
    q = y1 // n                                 # floor of the y-corner
    best = min(((abs(x1 + k * m) + abs(y1 - k * n), x1 + k * m, y1 - k * n) for k in (-1, 0, q, q + 1)))
    out.append(f"{best[1]} {best[2]}")
print('\n'.join(out))
