class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split()
n, pos = int(data[0]), int(data[1])
vals = [int(x) for x in data[2:2 + n]]

nodes = [Node(v) for v in vals]
for i in range(1, n):
    nodes[i - 1].next = nodes[i]
head = nodes[0] if n else None
if n and pos >= 0:
    nodes[n - 1].next = nodes[pos]   # build the cycle

# Act 1: Floyd detect — tortoise 1, hare 2
slow = head
fast = head
met = False
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow is fast:
        met = True
        break
if not met:
    print(0)
    raise SystemExit

# Act 2: freeze slow, walk p around one full lap
p = slow.next
C = 1
while p is not slow:
    p = p.next
    C += 1
print(C)
