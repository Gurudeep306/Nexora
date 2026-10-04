import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
low, best = a[0], 0
for x in a[1:]:
    best = max(best, x - low)        # sell today, bought at the cheapest day so far
    low = min(low, x)
print(best)
