import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
children = [[] for _ in range(n + 1)]
for i, p in enumerate(data[1:n], 2):
    children[int(p)].append(i)
depth = [0] * (n + 1)
best = 0
stack = [1]                            # explicit stack: no recursion limit to hit
while stack:
    u = stack.pop()
    d = depth[u]
    if d > best:
        best = d
    for w in children[u]:
        depth[w] = d + 1
        stack.append(w)
print(best)
