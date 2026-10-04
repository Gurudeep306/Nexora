import sys
data = sys.stdin.buffer.read().split()
n, T = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
i, j = 0, n - 1
found = False
while i < j:
    s = a[i] + a[j]
    if s == T:
        found = True
        break
    if s < T:
        i += 1                       # a[i] too small for every remaining partner
    else:
        j -= 1                       # a[j] too large for every remaining partner
print('YES' if found else 'NO')
