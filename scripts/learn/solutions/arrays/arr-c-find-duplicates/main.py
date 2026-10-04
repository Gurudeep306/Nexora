import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
dup = []
for i in range(n):
    v = abs(a[i])                    # the original value
    if a[v - 1] < 0:                 # home slot already marked: seen before
        dup.append(v)
    else:
        a[v - 1] = -a[v - 1]         # mark v as seen
print(' '.join(map(str, sorted(dup))) if dup else -1)
