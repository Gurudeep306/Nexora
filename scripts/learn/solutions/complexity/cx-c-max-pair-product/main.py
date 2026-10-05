import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = sorted(map(int, data[1:1 + n]))
print(max(a[0] * a[1], a[-1] * a[-2]))   # two most negative, or two largest
