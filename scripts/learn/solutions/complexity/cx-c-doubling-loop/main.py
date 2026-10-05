import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
print('\n'.join(str((1 << n.bit_length()) - 1) for n in map(int, data[1:1 + t])))
