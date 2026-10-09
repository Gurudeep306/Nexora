class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


def reverse_list(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev


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

ok = True
if head is not None:
    # split: next-next guard leaves slow at the LAST node of the first half
    slow = head
    fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    second_head = slow.next    # floor(n/2) nodes AFTER slow
    slow.next = None           # cut
    second_head = reverse_list(second_head)

    p = head
    q = second_head
    while q:
        if p.v != q.v:
            ok = False
            break
        q = q.next
        p = p.next

    slow.next = reverse_list(second_head)   # RESTORE on both exits

print(1 if ok else 0)
