import sys
data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
seen = {0: 1}                        # the empty prefix
p = count = 0
for x in map(int, data[2:2 + n]):
    p += x
    count += seen.get(p - k, 0)      # earlier prefixes P with p - P = k
    seen[p] = seen.get(p, 0) + 1
print(count)
