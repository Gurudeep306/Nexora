import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
h = list(map(int, data[1:1 + n]))
i, j = 0, n - 1
lmax = rmax = water = 0
while i <= j:
    if lmax <= rmax:                 # the left side's level is already certain
        lmax = max(lmax, h[i])
        water += lmax - h[i]
        i += 1
    else:
        rmax = max(rmax, h[j])
        water += rmax - h[j]
        j -= 1
print(water)
