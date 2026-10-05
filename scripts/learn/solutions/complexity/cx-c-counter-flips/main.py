import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
print('\n'.join(str(2 * n - bin(n).count('1')) for n in map(int, data[1:1 + t])))
