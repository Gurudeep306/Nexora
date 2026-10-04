from collections import deque
import sys
data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
dq = deque()                         # indices, values decreasing front -> back
out = []
for i, x in enumerate(a):
    while dq and a[dq[-1]] <= x:     # dominated forever
        dq.pop()
    dq.append(i)
    if dq[0] <= i - k:               # slid out of the window
        dq.popleft()
    if i >= k - 1:
        out.append(a[dq[0]])
print(' '.join(map(str, out)))
