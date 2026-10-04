import sys
data = sys.stdin.buffer.read().split()
n, T = int(data[0]), int(data[1])
a = sorted(map(int, data[2:2 + n]))
count = 0
for i in range(n):
    if i and a[i] == a[i - 1]:
        continue
    for j in range(i + 1, n):
        if j > i + 1 and a[j] == a[j - 1]:
            continue
        need, lo, hi = T - a[i] - a[j], j + 1, n - 1
        while lo < hi:
            s = a[lo] + a[hi]
            if s < need:
                lo += 1
            elif s > need:
                hi -= 1
            else:
                count += 1
                lo += 1
                while lo < hi and a[lo] == a[lo - 1]:
                    lo += 1
                hi -= 1
print(count)
