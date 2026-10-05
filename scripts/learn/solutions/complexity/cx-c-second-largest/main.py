import heapq
import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
first, second = heapq.nlargest(2, map(int, data[1:1 + n]))
print(second, n + (n - 1).bit_length() - 2)        # ceil(log2 n) = bit length of n - 1
