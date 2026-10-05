import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
t = int(data[0])
print('\n'.join(str(pow(3, (n - 1).bit_length(), MOD)) for n in map(int, data[1:1 + t])))
