import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
if n % 2:
    mn = mx = a[0]
    comps, start = 0, 1
else:
    mn, mx = min(a[0], a[1]), max(a[0], a[1])
    comps, start = 1, 2
# pair winners challenge the max, pair losers the min: 3 comparisons per pair
lo = list(map(min, a[start::2], a[start + 1::2]))
hi = list(map(max, a[start::2], a[start + 1::2]))
comps += 3 * len(lo)
print(min([mn] + lo), max([mx] + hi), comps)
