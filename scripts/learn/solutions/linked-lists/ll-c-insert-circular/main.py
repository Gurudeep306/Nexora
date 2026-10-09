import sys


class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = sys.stdin.buffer.read().split()
n = int(data[0])
x = int(data[1])
vals = [int(t) for t in data[2:2 + n]]

H = tail = None
for v in vals:
    nd = Node(v)
    if H is None:
        H = nd
    else:
        tail.next = nd
    tail = nd

if H is None:                        # empty ring: x alone
    print(x)
    sys.exit(0)

tail.next = H                        # close the ring

# One lap from H, examining pairs (a, b) INCLUDING the wrap pair (last, H).
# Insert into the FIRST qualifying pair: a <= x <= b, or the seam (a > b)
# with x >= a or x <= b. No pair qualifies (all equal) -> insert after H.
nd = Node(x)
a = H
done = False
for _ in range(n):
    b = a.next
    seam = a.v > b.v
    if (a.v <= x <= b.v) or (seam and (x >= a.v or x <= b.v)):
        nd.next = b
        a.next = nd
        done = True
        break
    a = b
if not done:                         # all values equal: insert after H
    nd.next = H.next
    H.next = nd

out = []
t = H
for _ in range(n + 1):
    out.append(str(t.v))
    t = t.next
print(' '.join(out))
