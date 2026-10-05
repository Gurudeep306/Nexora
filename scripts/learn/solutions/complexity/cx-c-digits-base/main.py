import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
v = list(map(int, data[1:1 + 2 * t]))
out = []
for i in range(0, 2 * t, 2):
    n, b = v[i], v[i + 1]
    d = 1
    while n >= b:          # strip one base-b digit
        n //= b
        d += 1
    out.append(d)
print('\n'.join(map(str, out)))
