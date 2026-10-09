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

# swap adjacent NODES: dummy absorbs the head change
dummy = Node(0)
dummy.next = head
prev = dummy
while prev.next and prev.next.next:  # a full pair exists
    a = prev.next
    b = a.next
    a.next = b.next  # a adopts the rest
    b.next = a       # b points back at a
    prev.next = b    # chain enters the pair through b
    prev = a         # a is the pair's new tail

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
