import sys
data = sys.stdin.buffer.read().split()
n, T = int(data[0]), int(data[1])
a = sorted(map(int, data[2:2 + n]))
best = a[0] + a[1] + a[2]


def solve():
    global best
    for i in range(n):
        lo, hi = i + 1, n - 1
        while lo < hi:
            s = a[i] + a[lo] + a[hi]
            d, bd = abs(s - T), abs(best - T)
            if d < bd or (d == bd and s < best):     # closer, or tie and smaller
                best = s
            if s < T:
                lo += 1
            elif s > T:
                hi -= 1
            else:
                return                                # exact hit
solve()
print(best)
