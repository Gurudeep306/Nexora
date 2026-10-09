class Node:
    __slots__ = ('c', 'e', 'next')

    def __init__(self, c, e):
        self.c = c
        self.e = e
        self.next = None


def build(pairs):
    head = tail = None
    for c, e in pairs:
        nd = Node(c, e)
        if head is None:
            head = nd
        else:
            tail.next = nd
        tail = nd
    return head


toks = open(0).read().split()
p = 0
na = int(toks[p]); p += 1
nb = int(toks[p]); p += 1
pairsA = []
for i in range(na):
    pairsA.append((int(toks[p]), int(toks[p + 1]))); p += 2
pairsB = []
for i in range(nb):
    pairsB.append((int(toks[p]), int(toks[p + 1]))); p += 2
a = build(pairsA)
b = build(pairsB)

# merge-walk on DESCENDING exponents; tie -> sum, drop if zero
dummy = Node(0, 0)
tail = dummy
while a and b:
    if a.e > b.e:
        tail.next = Node(a.c, a.e)
        tail = tail.next
        a = a.next
    elif b.e > a.e:
        tail.next = Node(b.c, b.e)
        tail = tail.next
        b = b.next
    else:
        s = a.c + b.c
        if s != 0:                       # cancel-and-drop
            tail.next = Node(s, a.e)
            tail = tail.next
        a = a.next
        b = b.next
while a:
    tail.next = Node(a.c, a.e)
    tail = tail.next
    a = a.next
while b:
    tail.next = Node(b.c, b.e)
    tail = tail.next
    b = b.next

out = []
t = dummy.next
while t:
    out.append(str(t.c))
    out.append(str(t.e))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
