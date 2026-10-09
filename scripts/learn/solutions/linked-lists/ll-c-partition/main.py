import sys

class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = sys.stdin.buffer.read().split()
n = int(data[0])
x = int(data[1])

head = tail = None
for i in range(n):
    nd = Node(int(data[2 + i]))
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# two dummy-headed chains: < x and >= x, appended in arrival order (stable)
less_d = Node(0)
geq_d = Node(0)
less, geq = less_d, geq_d
cur = head
while cur:
    if cur.v < x:
        less.next = cur
        less = cur
    else:
        geq.next = cur
        geq = cur
    cur = cur.next
geq.next = None          # SEAL the right chain
less.next = geq_d.next   # concatenate: one write

out = []
t = less_d.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
