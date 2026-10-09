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


def rev(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev


toks = open(0).read().split()
p = 0
na = int(toks[p]); p += 1
nb = int(toks[p]); p += 1
headA = build([int(toks[p + i]) for i in range(na)]); p += na
headB = build([int(toks[p + i]) for i in range(nb)]); p += nb

# reverse both, stream the carry, reverse the result — all iterative
a = rev(headA)
b = rev(headB)
carry = 0
dummy = Node(0)
tail = dummy
while a or b or carry:
    s = carry
    if a:
        s += a.v
        a = a.next
    if b:
        s += b.v
        b = b.next
    carry = s // 10
    tail.next = Node(s % 10)
    tail = tail.next

res = rev(dummy.next)
out = []
t = res
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out))
