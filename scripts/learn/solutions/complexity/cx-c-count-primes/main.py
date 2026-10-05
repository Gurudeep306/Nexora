import sys
data = sys.stdin.buffer.read().split()
from itertools import accumulate
t = int(data[0])
q = list(map(int, data[1:1 + t]))
N = max(q + [2])
is_p = bytearray([1]) * (N + 1)
is_p[0] = is_p[1] = 0
i = 2
while i * i <= N:
    if is_p[i]:
        is_p[i * i::i] = bytes(len(range(i * i, N + 1, i)))   # cross out a whole progression in C
    i += 1
pi = list(accumulate(is_p))                                     # prefix counts
print('\n'.join(str(pi[n]) for n in q))
