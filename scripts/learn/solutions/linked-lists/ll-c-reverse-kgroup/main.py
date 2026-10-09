class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split()
n, k = int(data[0]), int(data[1])
vals = [int(x) for x in data[2:2 + n]]

head = tail = None
for v in vals:
    nd = Node(v)
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

dummy = Node(0)
dummy.next = head
group_prev = dummy
while True:
    # PROBE: is there a full group of k after group_prev?
    probe = group_prev
    i = 0
    while i < k and probe is not None:
        probe = probe.next
        i += 1
    if probe is None:
        break                              # partial group: leave as is
    group_head = group_prev.next           # bookmark: becomes the group's tail
    prev, cur = None, group_head
    for _ in range(k):                     # exactly k flips
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    group_prev.next = prev                 # front stitch
    group_head.next = cur                  # back stitch
    group_prev = group_head                # anchor -> this group's tail

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
