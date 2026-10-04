import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
mx = mn = a[0]                      # start from a real element
for x in a[1:]:
    if x > mx:
        mx = x
    if x < mn:
        mn = x
print(mx, mn)
