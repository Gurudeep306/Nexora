import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
c1, c2, k1, k2 = 0, 1, 0, 0
for x in a:
    if x == c1:
        k1 += 1
    elif x == c2:
        k2 += 1
    elif k1 == 0:
        c1, k1 = x, 1
    elif k2 == 0:
        c2, k2 = x, 1
    else:                            # discard a triple of different values
        k1 -= 1
        k2 -= 1
res = sorted({c for c in (c1, c2) if 3 * a.count(c) > n})   # verify both candidates
print(' '.join(map(str, res)) if res else -1)
