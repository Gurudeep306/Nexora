import sys
data = sys.stdin.buffer.read().split()
n, T = int(data[0]), int(data[1])
seen = {}
count = 0
for x in map(int, data[2:2 + n]):
    count += seen.get(T - x, 0)      # earlier partners of x
    seen[x] = seen.get(x, 0) + 1
print(count)
