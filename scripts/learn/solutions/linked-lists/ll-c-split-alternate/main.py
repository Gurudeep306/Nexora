class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split()
p = 0
n = int(data[p]); p += 1
head = in_tail = None
for i in range(n):
    nd = Node(int(data[p])); p += 1
    if head is None:
        head = nd
    else:
        in_tail.next = nd
    in_tail = nd

# thread two chains in one walk
dA = Node(0)
dB = Node(0)
tA, tB = dA, dB
cur = head
toA = True
while cur:
    nxt = cur.next          # save BEFORE threading rewrites cur.next
    if toA:
        tA.next = cur
        tA = cur
    else:
        tB.next = cur
        tB = cur
    toA = not toA
    cur = nxt
tA.next = None              # SEAL both tails
tB.next = None


def render(h):
    out = []
    t = h
    while t:
        out.append(str(t.v))
        t = t.next
    return ' '.join(out) if out else 'EMPTY'


print(render(dA.next))
print(render(dB.next))
