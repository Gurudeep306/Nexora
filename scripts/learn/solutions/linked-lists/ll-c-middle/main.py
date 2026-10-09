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

# fast/slow: guard (fast and fast.next) => second middle on even n
slow = head
fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next

print(slow.v)
