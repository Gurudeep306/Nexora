import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
keep, dele, best = a[0], float('-inf'), a[0]
for x in a[1:]:
    dele = max(dele + x, keep)       # deleted earlier, or delete x now
    keep = max(keep + x, x)          # plain Kadane
    best = max(best, keep, dele)
print(best)
