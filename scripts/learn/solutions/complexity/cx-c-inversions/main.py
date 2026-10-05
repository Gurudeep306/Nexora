import sys
data = sys.stdin.buffer.read().split()
from bisect import bisect_right
from itertools import repeat

n = int(data[0])
blocks = [[x] for x in map(int, data[1:1 + n])]
inv = 0
while len(blocks) > 1:               # bottom-up merge sort, one level per pass
    nxt = []
    for i in range(0, len(blocks) - 1, 2):
        L, R = blocks[i], blocks[i + 1]
        # each r in R is an inversion with every element of L greater than r
        inv += len(L) * len(R) - sum(map(bisect_right, repeat(L, len(R)), R))
        nxt.append(sorted(L + R))    # two sorted runs: Timsort merges them in linear time
    if len(blocks) % 2:
        nxt.append(blocks[-1])
    blocks = nxt
print(inv)
