import sys
data = sys.stdin.buffer.read().split()
n, m = int(data[0]), int(data[1])
A = list(map(int, data[2:2 + n]))
B = list(map(int, data[2 + n:2 + n + m]))
out = []
i = j = 0
while i < n and j < m:
    if A[i] <= B[j]:                 # ties: A first (stable)
        out.append(A[i])
        i += 1
    else:
        out.append(B[j])
        j += 1
out.extend(A[i:])
out.extend(B[j:])
print(' '.join(map(str, out)))
