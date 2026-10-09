class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split()
length, nth = int(data[0]), int(data[1])
vals = [int(x) for x in data[2:2 + length]]

head = tail = None
for v in vals:
    nd = Node(v)
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# fixed gap of n: send first ahead, then slide both
first = head
second = head
for _ in range(nth):
    first = first.next
while first:
    first = first.next
    second = second.next

print(second.v)
