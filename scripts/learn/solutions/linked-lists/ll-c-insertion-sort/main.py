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

# insertion sort: dummy-headed sorted result, detach + scan + splice
dummy = Node(0)
cur = head
while cur:
    nxt = cur.next  # save before cur leaves the input
    p = dummy
    while p.next and p.next.v < cur.v:  # strict < keeps it stable
        p = p.next
    cur.next = p.next  # splice: two writes
    p.next = cur
    cur = nxt

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
