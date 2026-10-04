import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
p, x = int(data[1 + n]), int(data[2 + n])
a.append(0)                          # one spare slot
for i in range(n, p, -1):            # shift right, from the end
    a[i] = a[i - 1]
a[p] = x
print(' '.join(map(str, a)))
