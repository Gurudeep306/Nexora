import sys
data = sys.stdin.buffer.read().split()
M = 10**9 + 7
k = int(data[0])
d, s = 1, 1
for i in range(k):
    p, e = int(data[1 + 2 * i]), int(data[2 + 2 * i])
    d = d * ((e + 1) % M) % M
    r = p % M
    if r == 1:
        term = (e + 1) % M                                   # 1 + 1 + ... + 1
    else:
        term = (pow(r, e + 1, M) - 1) * pow(r - 1, M - 2, M) % M
    s = s * term % M
print(d, s)
