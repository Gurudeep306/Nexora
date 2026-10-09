class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split('\n')
n = int(data[0])
vals = list(map(int, data[1].split())) if n else []

dummy = Node(0)
tail = dummy
for v in vals:
    nd = Node(v)
    tail.next = nd
    tail = nd

# dummy head (the head itself can be a victim); prev never enters a run.
prev = dummy
while prev.next and prev.next.next:
    if prev.next.v == prev.next.next.v:
        dup = prev.next.v                  # remember the run's value
        while prev.next and prev.next.v == dup:
            prev.next = prev.next.next     # unlink the WHOLE run
        # prev stays put: the new prev.next is unexamined
    else:
        prev = prev.next                   # unique so far, keep it

head = dummy.next
out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
