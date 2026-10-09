class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split()
length, nth = int(data[0]), int(data[1])
vals = [int(x) for x in data[2:2 + length]]

head = tail = None
for v in vals:
    nd = Node(v)
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# dummy head + gap n+1: second lands on the victim's predecessor
dummy = Node(0)
dummy.next = head
first = dummy
second = dummy
for _ in range(nth + 1):
    first = first.next
while first:
    first = first.next
    second = second.next
second.next = second.next.next   # skip over the victim

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
