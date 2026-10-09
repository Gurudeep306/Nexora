import sys


class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = sys.stdin.buffer.read().split()
n = int(data[0]) if data else 0
vals = [int(x) for x in data[1:1 + n]]

dummy = Node(0)
tail = dummy
for v in vals:
    nd = Node(v)
    tail.next = nd
    tail = nd

# Pass 1: store the LAST node reaching each prefix sum.
# Prefix 0 maps to the dummy, so a zero-sum prefix deletes from the head.
seen = {0: dummy}
p = 0
t = dummy.next
while t:
    p += t.v
    seen[p] = t              # LAST occurrence wins (overwrite)
    t = t.next

# Pass 2: at each node with prefix p, jump over everything up to seen[p]:
# everything between two equal prefix sums sums to zero.
p = 0
t = dummy
while t:
    p += t.v                 # dummy contributes 0
    t.next = seen[p].next
    t = t.next

head = dummy.next
out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
