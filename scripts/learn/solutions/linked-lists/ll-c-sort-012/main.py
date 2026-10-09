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

# thread three dummy-headed chains in one walk
d = [Node(0), Node(0), Node(0)]
t = [d[0], d[1], d[2]]
cur = head
while cur:
    nxt = cur.next        # save: cur is about to leave the input
    b = cur.v
    t[b].next = cur       # route to its chain's tail
    t[b] = cur
    cur = nxt
t[2].next = None          # SEAL the last tail

# concatenate the non-empty chains 0 -> 1 -> 2
res = res_tail = None
for b in range(3):
    if d[b].next is None:
        continue
    if res is None:
        res = d[b].next
    else:
        res_tail.next = d[b].next
    res_tail = t[b]

out = []
x = res
while x:
    out.append(str(x.v))
    x = x.next
print(' '.join(out) if out else 'EMPTY')
