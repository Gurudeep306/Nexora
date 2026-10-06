import sys
data = sys.stdin.buffer.read().split()
M = 10**9 + 7
n = int(data[0])
s, p = 0, 1
for tok in data[1:n + 1]:
    r = int(tok) % M          # Python's % is already non-negative
    s = (s + r) % M
    p = p * r % M
print(s, p)
