class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split()
p = 0
n = int(data[p]); p += 1
k = int(data[p]); p += 1
dummy = Node(0)
tail = dummy
for i in range(n):
    tail.next = Node(int(data[p])); p += 1
    tail = tail.next

anchor = dummy
do_reverse = True
while anchor.next:
    # PROBE: count min(k, remaining) nodes of this group
    probe = anchor.next
    cnt = 1
    while cnt < k and probe.next:
        probe = probe.next
        cnt += 1
    if do_reverse:
        group_head = anchor.next
        after = probe.next          # first node past the group
        prev = after                # seed: tail links onward directly
        cur = group_head
        while cur is not after:
            nxt = cur.next
            cur.next = prev
            prev = cur
            cur = nxt
        anchor.next = prev          # prev == probe: group's new head
        anchor = group_head         # original head is now the group's TAIL
    else:
        anchor = probe              # skipped group's LAST node
    do_reverse = not do_reverse

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out))
