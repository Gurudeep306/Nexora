class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split('\n')
n = int(data[0])
vals = list(map(int, data[1].split())) if n else []

head = tail = None
for v in vals:
    nd = Node(v)
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# fold while walking: acc = acc*2 + bit (MSB first)
acc = 0
t = head
while t:
    acc = acc * 2 + t.v
    t = t.next
print(acc)
