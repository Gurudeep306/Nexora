class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split()
n, m, k = int(data[0]), int(data[1]), int(data[2])
vals = [int(x) for x in data[3:3 + n]]

head = tail = None
for v in vals:
    nd = Node(v)
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# dummy head absorbs m == 1
dummy = Node(0)
dummy.next = head
anchor = dummy
for _ in range(1, m):          # walk to position m-1
    anchor = anchor.next
range_head = anchor.next       # bookmark BEFORE flipping
prev, cur = None, range_head
for _ in range(k - m + 1):     # exactly k-m+1 flips
    nxt = cur.next
    cur.next = prev
    prev = cur
    cur = nxt
anchor.next = prev             # front stitch
range_head.next = cur          # back stitch

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
