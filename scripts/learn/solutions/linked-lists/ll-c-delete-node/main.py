class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = open(0).read().split('\n')
n, idx = map(int, data[0].split())
vals = list(map(int, data[1].split()))

head = tail = None
for v in vals:
    nd = Node(v)
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd

# walk to position idx — in the interview you are HANDED this pointer
node = head
for _ in range(idx):
    node = node.next


# The classic trick: given ONLY a pointer to the victim (never the tail),
# copy the successor's value forward and bypass the successor.
def delete_node(node):
    node.v = node.next.v        # steal the successor's contents
    node.next = node.next.next  # bypass it


delete_node(node)

out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out))
