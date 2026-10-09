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

if head and head.next:
    # Phase 1: middle (next-next guard: slow = last node of first half) + cut
    slow, fast = head, head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    second = slow.next
    slow.next = None           # cut

    # Phase 2: reverse the second half — save before you sever
    prev, cur = None, second
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    second = prev

    # Phase 3: zip; the shorter-or-equal second chain drives the loop
    first = head
    while second:
        t1 = first.next
        t2 = second.next       # save BOTH before any write
        first.next = second
        second.next = t1
        first = t1
        second = t2

out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
