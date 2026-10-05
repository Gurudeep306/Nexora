import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
p, out = 1, []
for _ in range(t):
    d = int(data[p])
    coeffs = data[p + 1:p + 2 + d]
    p += d + 2
    top = next(d - i for i, c in enumerate(coeffs) if int(c) != 0)   # first non-zero
    out.append('Theta(1)' if top == 0 else 'Theta(n)' if top == 1 else f'Theta(n^{top})')
print('\n'.join(out))
