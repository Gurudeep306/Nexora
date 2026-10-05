import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
out = []
for n in map(int, data[1:1 + t]):
    a, b = 0, 1                     # F(0), F(1)
    for _ in range(n + 1):
        a, b = b, a + b             # a = F(n + 1) after the loop
    out.append(2 * a - 1)           # C(n) = 2F(n + 1) - 1
print('\n'.join(map(str, out)))
