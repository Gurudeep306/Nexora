import sys
data = sys.stdin.buffer.read().split()
q = int(data[0])
out = []
for i in range(q):
    a, b, m = int(data[1 + 3 * i]), int(data[2 + 3 * i]), int(data[3 + 3 * i])
    out.append(a % m * (b % m) % m)   # Python ints are unbounded; % is non-negative
print('\n'.join(map(str, out)))
