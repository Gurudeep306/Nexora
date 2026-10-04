import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
p = int(data[1 + n])
for i in range(p, n - 1):            # shift left, from the hole
    a[i] = a[i + 1]
a.pop()
print(' '.join(map(str, a)) if a else 'EMPTY')
