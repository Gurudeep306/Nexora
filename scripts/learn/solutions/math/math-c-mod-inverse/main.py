import sys
data = sys.stdin.buffer.read().split()


def inverse(a, m):
    """inverse of a modulo m, or -1 if gcd(a, m) != 1"""
    r0, r1, s0, s1 = a % m, m, 1, 0      # invariant: r_i ≡ a * s_i (mod m)
    while r1:
        q = r0 // r1
        r0, r1 = r1, r0 - q * r1
        s0, s1 = s1, s0 - q * s1
    return s0 % m if r0 == 1 else -1     # Python's % is already non-negative


t = int(data[0])
out = []
for i in range(t):
    out.append(inverse(int(data[1 + 2 * i]), int(data[2 + 2 * i])))
print('\n'.join(map(str, out)))
