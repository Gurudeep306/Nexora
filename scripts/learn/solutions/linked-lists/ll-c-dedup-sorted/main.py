import sys

class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = sys.stdin.buffer.read().split()
n = int(data[0])

head = tail = None
for i in range(n):
    nd = Node(int(data[1 + i]))
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# sorted dedup: adjacency replaces the seen-set
cur = head
while cur and cur.next:
    if cur.v == cur.next.v:
        cur.next = cur.next.next  # unlink the repeat; cur stays
    else:
        cur = cur.next            # first occurrence of a new value

out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
