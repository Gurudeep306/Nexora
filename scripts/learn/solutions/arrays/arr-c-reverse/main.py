import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = data[1:1 + n]
i, j = 0, n - 1
while i < j:                         # two pointers walking inward
    a[i], a[j] = a[j], a[i]
    i += 1
    j -= 1
print(' '.join(x.decode() for x in a))
