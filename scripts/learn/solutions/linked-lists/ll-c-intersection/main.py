import sys

class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


tokens = sys.stdin.buffer.read().split()
idx = 0


def read_chain(n):
    """Return (head, tail) of n fresh nodes."""
    global idx
    head = tail = None
    for _ in range(n):
        nd = Node(int(tokens[idx]))
        idx += 1
        if head is None:
            head = nd
        else:
            tail.next = nd
        tail = nd
    return head, tail


na = int(tokens[idx]); idx += 1
nb = int(tokens[idx]); idx += 1
nc = int(tokens[idx]); idx += 1

ha, ta = read_chain(na)   # A's own part
hb, tb = read_chain(nb)   # B's own part
hc, tc = read_chain(nc)   # shared tail (SAME nodes for both lists)
if ta:
    ta.next = hc          # A = own + shared
if tb:
    tb.next = hc          # B = own + shared
A = ha if ha else hc      # A's full head (na = 0 -> shared head IS A)
B = hb if hb else hc

# switch-partners walk: both routes reach the join after na + nb steps
p, q = A, B
while p is not q:
    p = p.next if p is not None else B
    q = q.next if q is not None else A

ans = -1
if p is not None:         # met on a real node: find its index along A
    ans = 0
    t = A
    while t is not p:
        ans += 1
        t = t.next
print(ans)
