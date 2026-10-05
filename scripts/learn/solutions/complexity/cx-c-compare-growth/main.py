import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
v = list(map(int, data[1:1 + 6 * t]))
out = []
for i in range(0, 6 * t, 6):
    f, g = v[i:i + 3], v[i + 3:i + 6]    # (p, a, b): compared lexicographically
    out.append('<' if f < g else '>' if f > g else '=')
print('\n'.join(out))
