import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
for i in range(n):
    while 1 <= a[i] <= n and a[a[i] - 1] != a[i]:
        h = a[i] - 1                 # send a[i] to its home index
        a[i], a[h] = a[h], a[i]
ans = n + 1
for i in range(n):
    if a[i] != i + 1:
        ans = i + 1
        break
print(ans)
