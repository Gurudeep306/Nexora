import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
print('\n'.join(str(int(x).bit_length() - 1) for x in data[1:1 + t]))   # exact floor(log2 n)
