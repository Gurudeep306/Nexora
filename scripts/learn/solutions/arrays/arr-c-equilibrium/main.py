import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
total = sum(a)
left = 0                             # sum of a[0..i-1]
ans = -1
for i, x in enumerate(a):
    if left == total - left - x:
        ans = i
        break
    left += x
print(ans)
