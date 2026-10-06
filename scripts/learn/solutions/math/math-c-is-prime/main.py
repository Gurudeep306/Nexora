import sys
data = sys.stdin.buffer.read().split()


def is_prime(n):
    if n < 2:
        return False
    if n % 2 == 0:
        return n == 2
    d = 3
    while d * d <= n:                  # a factor <= sqrt(n) must exist
        if n % d == 0:
            return False
        d += 2
    return True


t = int(data[0])
print('\n'.join('YES' if is_prime(int(x)) else 'NO' for x in data[1:1 + t]))
