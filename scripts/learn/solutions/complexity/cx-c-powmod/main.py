import sys
data = sys.stdin.buffer.read().split()
q = int(data[0])
out = []
for i in range(q):
    a, b, m = int(data[1 + 3 * i]), int(data[2 + 3 * i]), int(data[3 + 3 * i])
    result, base = 1 % m, a % m
    while b > 0:
        if b & 1:                    # this bit of b is set
            result = result * base % m
        base = base * base % m       # a^(2^k) for the next bit
        b >>= 1
    out.append(result)               # (the built-in pow(a, b, m) does the same)
print('\n'.join(map(str, out)))
