class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split('\n')
n, x = map(int, data[0].split())
vals = list(map(int, data[1].split())) if n else []

dummy = Node(0)
tail = dummy
for v in vals:
    nd = Node(v)
    tail.next = nd
    tail = nd

# dummy head: walk with prev, unlink matching prev.next, do NOT advance prev
prev = dummy
while prev.next:
    if prev.next.v == x:
        prev.next = prev.next.next  # unlink; prev stays put
    else:
        prev = prev.next            # only advance when we KEEP the node

head = dummy.next                   # never return the original head
out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
