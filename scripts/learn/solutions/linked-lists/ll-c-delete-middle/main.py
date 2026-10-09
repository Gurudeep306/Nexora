class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split()
p = 0
n = int(data[p]); p += 1
dummy = Node(0)
tail = dummy
for i in range(n):
    tail.next = Node(int(data[p])); p += 1
    tail = tail.next

# one pass: slow trails fast, ending on the victim's PREDECESSOR
slow = fast = dummy
while fast.next and fast.next.next:
    slow = slow.next
    fast = fast.next.next
victim = slow.next        # floor(n/2): second middle on even n
slow.next = victim.next   # bypass

head = dummy.next
out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
