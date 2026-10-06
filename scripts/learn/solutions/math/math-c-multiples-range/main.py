import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
out = []
for i in range(t):
    L, R, k = int(data[1 + 3 * i]), int(data[2 + 3 * i]), int(data[3 + 3 * i])
    out.append(R // k - (L - 1) // k)          # Python // is already floor division
print('\n'.join(map(str, out)))
