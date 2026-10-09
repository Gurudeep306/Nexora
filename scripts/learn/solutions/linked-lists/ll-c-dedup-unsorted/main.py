import sys

class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = sys.stdin.buffer.read().split()
n = int(data[0])

head = tail = None
for i in range(n):
    nd = Node(int(data[1 + i]))
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# seen-set + dummy-headed prev-walk: unlink repeats, keep first occurrences
seen = set()
dummy = Node(0)
dummy.next = head
prev = dummy
while prev.next:
    cur = prev.next
    if cur.v in seen:
        prev.next = cur.next  # unlink; prev stays
    else:
        seen.add(cur.v)
        prev = cur            # keep: cur becomes the new anchor

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
