import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
print(sum(map(int, data[1:1 + n])))   # Python ints never overflow
