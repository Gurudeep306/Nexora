import sys
data = sys.stdin.buffer.read().split()
M = 10**9 + 7


def fib(n):
    a, b = 0, 1                                  # (F(k), F(k+1)), k = 0
    for bit in bin(n)[2:]:
        c = a * ((2 * b - a) % M) % M            # F(2k)
        d = (a * a + b * b) % M                  # F(2k+1)
        a, b = (d, (c + d) % M) if bit == '1' else (c, d)
    return a


q = int(data[0])
print('\n'.join(str(fib(int(x))) for x in data[1:1 + q]))
