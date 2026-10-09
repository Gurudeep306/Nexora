class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split('\n')
n, x = map(int, data[0].split())
vals = list(map(int, data[1].split())) if n else []

dummy = Node(float('-inf'))  # -inf sentinel: new-head case falls out of the loop
tail = dummy
for v in vals:
    nd = Node(v)
    tail.next = nd
    tail = nd

# walk to the first node NOT <= x; splice before it (equals: x goes AFTER)
prev = dummy
while prev.next and prev.next.v <= x:
    prev = prev.next
nd = Node(x)
nd.next = prev.next
prev.next = nd

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out))
