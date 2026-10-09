import sys

class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = sys.stdin.buffer.read().split()
n = int(data[0])
k = int(data[1])

head = tail = None
for i in range(n):
    nd = Node(int(data[2 + i]))
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# close-the-ring walk
if head and n > 0:
    k %= n                         # rotating by n is a no-op
    if k != 0:
        tail.next = head           # close the ring
        new_tail = head
        for _ in range(n - k - 1):
            new_tail = new_tail.next
        head = new_tail.next       # old next is the new head
        new_tail.next = None       # cut

out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
