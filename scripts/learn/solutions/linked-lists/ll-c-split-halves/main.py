class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split('\n')
n = int(data[0])
vals = list(map(int, data[1].split())) if n else []

head = tail = None
for v in vals:
    nd = Node(v)
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# split convention: slow=head, fast=head.next, while(fast and fast.next)
slow = head
fast = head.next if head else None
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
second = slow.next
slow.next = None                 # THE CUT


def render(h):
    out = []
    t = h
    while t:
        out.append(str(t.v))
        t = t.next
    return ' '.join(out) if out else 'EMPTY'


print(render(head))
print(render(second))
