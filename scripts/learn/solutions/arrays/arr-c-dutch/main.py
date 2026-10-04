import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
lo = mid = 0
hi = n - 1                           # [0,lo)=0  [lo,mid)=1  [mid,hi]=?  (hi,n)=2
while mid <= hi:
    if a[mid] == 0:
        a[lo], a[mid] = a[mid], a[lo]
        lo += 1
        mid += 1
    elif a[mid] == 1:
        mid += 1
    else:
        a[mid], a[hi] = a[hi], a[mid]   # a[mid] is still unknown
        hi -= 1
print(' '.join(map(str, a)))
