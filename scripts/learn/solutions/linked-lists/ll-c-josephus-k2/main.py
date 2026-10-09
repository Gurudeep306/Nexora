import sys

data = sys.stdin.buffer.read().split()
T = int(data[0])
out = []
for i in range(1, T + 1):
    n = int(data[i])
    # closed form for k=2: n = 2^m + l (0 <= l < 2^m) -> survivor 2l+1
    p = 1 << (n.bit_length() - 1)   # largest power of two <= n
    l = n - p
    out.append(str(2 * l + 1))
sys.stdout.write('\n'.join(out) + '\n')
