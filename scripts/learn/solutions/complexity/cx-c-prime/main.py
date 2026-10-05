import sys
data = sys.stdin.buffer.read().split()


def is_prime(n):
    if n < 2:
        return False
    if n < 4:                        # 2 and 3
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:                # candidates 6k - 1 and 6k + 1
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True


t = int(data[0])
print('\n'.join('YES' if is_prime(int(x)) else 'NO' for x in data[1:1 + t]))
