import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
first = {}
for i, x in enumerate(data[1:n + 1], 1):
    if x not in first:                     # keep the earliest position
        first[x] = i
q = int(data[n + 1])
print('\n'.join(str(first.get(x, n)) for x in data[n + 2:n + 2 + q]))
