class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


def build(vals):
    head = tail = None
    for v in vals:
        nd = Node(v)
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
a = build([int(toks[p + i]) for i in range(na)]); p += na
b = build([int(toks[p + i]) for i in range(nb)]); p += nb

# merge-walk with dedup against the RESULT tail
dummy = Node(0)
tail = dummy
any_appended = False


def take(v):
    global tail, any_appended
    if any_appended and tail.v == v:
        return                      # dedup vs result tail
    tail.next = Node(v)
    tail = tail.next
    any_appended = True


while a and b:
    if a.v <= b.v:
        take(a.v)
        a = a.next
    else:
        take(b.v)
        b = b.next
while a:
    take(a.v)
    a = a.next
while b:
    take(b.v)
    b = b.next

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
