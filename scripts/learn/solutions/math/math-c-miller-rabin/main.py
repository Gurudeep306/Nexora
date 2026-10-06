import sys
data = sys.stdin.buffer.read().split()
BASES = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)


def is_prime(n):
    if n < 2:
        return False
    for p in BASES:
        if n % p == 0:
            return n == p
    d, r = n - 1, 0
    while d % 2 == 0:                  # n - 1 = d * 2^r
        d //= 2
        r += 1
    for a in BASES:
        x = pow(a, d, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False               # a proves n composite
    return True


t = int(data[0])
print('\n'.join('YES' if is_prime(int(x)) else 'NO' for x in data[1:1 + t]))
