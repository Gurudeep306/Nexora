class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


def read_chain(n, toks, p):
    arr = []
    head = tail = None
    for i in range(n):
        nd = Node(int(toks[p])); p += 1
        arr.append(nd)
        if head is None:
            head = nd
        else:
            tail.next = nd
        tail = nd
    return arr, head, p


def floyd(head):
    """Return (has_cycle, entrance). Compare NODES, never values."""
    if head is None:
        return False, None
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:               # meeting point
            p = head
            while p is not slow:
                p = p.next
                slow = slow.next
            return True, p             # entrance
    return False, None


def dist_to(head, target):
    d = 0
    p = head
    while p is not target:
        p = p.next
        d += 1
    return d


toks = open(0).read().split()
p = 0
na = int(toks[p]); p += 1
nb = int(toks[p]); p += 1
nc = int(toks[p]); p += 1
pos = int(toks[p]); p += 1
ownA, headA, p = read_chain(na, toks, p)
ownB, headB, p = read_chain(nb, toks, p)
shared, sharedHead, p = read_chain(nc, toks, p)  # shared nodes built ONCE

# head of each list: its own part, or the shared part when it has no own nodes
headA = ownA[0] if ownA else sharedHead
headB = ownB[0] if ownB else sharedHead

# join: each list = own part followed by the shared part
if ownA and sharedHead:
    ownA[-1].next = sharedHead
if ownB and sharedHead:
    ownB[-1].next = sharedHead
if nc > 0 and pos >= 0:
    shared[-1].next = shared[pos]      # cycle

cycA, entA = floyd(headA)
cycB, entB = floyd(headB)

answer = -1
if cycA != cycB:
    answer = -1                        # exactly one cyclic: cannot intersect
elif not cycA:
    # both acyclic: length-align, walk in lockstep, compare NODES
    lenA = dist_to(headA, None)
    lenB = dist_to(headB, None)
    a, b = headA, headB
    idx = 0
    d = lenA - lenB
    while d > 0:
        a = a.next
        idx += 1
        d -= 1
    d = lenB - lenA
    while d > 0:
        b = b.next
        d -= 1
    while a is not b:
        a = a.next
        b = b.next
        idx += 1
    if a is not None:
        answer = idx                   # both null -> -1
elif entA is entB:
    # same entrance: the Y happens BEFORE the cycle — aligned walk bounded by it
    dA = dist_to(headA, entA)
    dB = dist_to(headB, entB)
    a, b = headA, headB
    idx = 0
    d = dA - dB
    while d > 0:
        a = a.next
        idx += 1
        d -= 1
    d = dB - dA
    while d > 0:
        b = b.next
        d -= 1
    while a is not b and a is not entA:
        a = a.next
        b = b.next
        idx += 1
    answer = idx if a is b else dA
else:
    # different entrances: intersect iff B's entrance lies on A's cycle
    q = entA
    found = False
    while True:
        if q is entB:
            found = True
            break
        q = q.next
        if q is entA:
            break
    if found:
        answer = dist_to(headA, entA)  # first shared node IS A's entrance

print(answer)
