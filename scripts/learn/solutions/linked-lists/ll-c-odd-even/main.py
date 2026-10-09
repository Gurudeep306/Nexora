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

# odd/even POSITIONS: two chains grow in one walk
if head:
    odd = head
    even = head.next
    even_head = even        # save: even strides away
    while even and even.next:   # even runs out first — guard it
        odd.next = even.next
        odd = odd.next
        even.next = odd.next
        even = even.next
    odd.next = even_head    # one write concatenates

out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
