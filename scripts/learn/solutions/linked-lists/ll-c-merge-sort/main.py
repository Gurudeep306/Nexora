import sys

class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


data = sys.stdin.buffer.read().split()
n = int(data[0])

head = tail = None
for i in range(n):
    nd = Node(int(data[1 + i]))
    if head is None:
        head = nd
    else:
        tail.next = nd
    tail = nd


def split_middle(h):
    # slow ends at index ceil(n/2)-1; guard makes a 2-node list split 1+1
    slow, fast = h, h.next
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    second = slow.next
    slow.next = None  # the cut
    return second


def merge(a, b):
    dummy = Node(0)
    t = dummy
    while a and b:
        if a.v <= b.v:
            t.next = a
            a = a.next
        else:
            t.next = b
            b = b.next
        t = t.next
    t.next = a if a else b
    return dummy.next


def merge_sort(h):
    if not h or not h.next:
        return h
    second = split_middle(h)
    return merge(merge_sort(h), merge_sort(second))


head = merge_sort(head)

out = []
t = head
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
