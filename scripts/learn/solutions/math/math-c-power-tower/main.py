import sys
data = sys.stdin.buffer.read().split()
P = 10**9 + 7
q = int(data[0])
out = []
for i in range(q):
    a, b, c = int(data[1 + 3 * i]), int(data[2 + 3 * i]), int(data[3 + 3 * i])
    if a % P == 0:
        out.append(1 if b == 0 and c > 0 else 0)          # 0^E: 1 only for E = 0
    else:
        out.append(pow(a % P, pow(b, c, P - 1), P))       # Fermat: exponent mod P-1
print('\n'.join(map(str, out)))
