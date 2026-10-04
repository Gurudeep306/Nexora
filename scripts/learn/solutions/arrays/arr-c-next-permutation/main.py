import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
i = n - 2
while i >= 0 and a[i] >= a[i + 1]:   # pivot: last ascent
    i -= 1
if i >= 0:
    j = n - 1
    while a[j] <= a[i]:              # rightmost value bigger than the pivot
        j -= 1
    a[i], a[j] = a[j], a[i]
a[i + 1:] = a[i + 1:][::-1]          # smallest arrangement of the suffix
print(' '.join(map(str, a)))
