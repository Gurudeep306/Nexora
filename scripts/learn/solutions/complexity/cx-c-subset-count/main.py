import sys
data = sys.stdin.buffer.read().split()
n, T = int(data[0]), int(data[1])
sums = [0]
for x in map(int, data[2:2 + n]):
    sums += [s + x for s in sums]       # every old subset, now also with x
print(sums.count(T))
