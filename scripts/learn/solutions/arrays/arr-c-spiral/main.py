import sys
data = sys.stdin.buffer.read().split()
R, C = int(data[0]), int(data[1])
a = [data[2 + i * C: 2 + (i + 1) * C] for i in range(R)]
out = []
top, bottom, left, right = 0, R - 1, 0, C - 1
while top <= bottom and left <= right:
    for j in range(left, right + 1):
        out.append(a[top][j])
    top += 1
    for i in range(top, bottom + 1):
        out.append(a[i][right])
    right -= 1
    if top <= bottom:                # a bottom row is left
        for j in range(right, left - 1, -1):
            out.append(a[bottom][j])
        bottom -= 1
    if left <= right:                # a left column is left
        for i in range(bottom, top - 1, -1):
            out.append(a[i][left])
        left += 1
print(' '.join(x.decode() for x in out))
