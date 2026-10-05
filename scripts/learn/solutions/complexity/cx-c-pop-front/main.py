import sys
data = sys.stdin.buffer.read().split()
q = int(data[0])
a, out = [], []
head, p = 0, 1                          # head = index of the current front
for _ in range(q):
    if data[p] == b'1':
        a.append(data[p + 1])
        p += 2
    else:
        out.append(a[head])             # O(1): no pop(0), nothing moves
        head += 1
        p += 1
sys.stdout.write(b'\n'.join(out).decode() + ('\n' if out else ''))
