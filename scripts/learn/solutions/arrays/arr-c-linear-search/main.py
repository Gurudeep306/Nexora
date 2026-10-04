import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = data[1:1 + n]
x = data[1 + n]
ans = -1
for i in range(n):
    if int(a[i]) == int(x):          # first occurrence: stop here
        ans = i
        break
print(ans)
