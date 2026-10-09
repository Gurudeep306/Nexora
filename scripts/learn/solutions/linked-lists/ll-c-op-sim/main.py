import sys

# Doubly linked list with head AND tail pointers: end ops are O(1),
# middle insert/erase walk from the closer end.


class Node:
    __slots__ = ('v', 'prev', 'next')

    def __init__(self, v):
        self.v = v
        self.prev = None
        self.next = None


data = sys.stdin.buffer.read().split()
pos = 0
q = int(data[pos]); pos += 1

head = tail = None
size = 0


def push_front(v):
    global head, tail, size
    nd = Node(v)
    nd.next = head
    if head is not None:
        head.prev = nd
    else:
        tail = nd
    head = nd
    size += 1


def push_back(v):
    global head, tail, size
    nd = Node(v)
    nd.prev = tail
    if tail is not None:
        tail.next = nd
    else:
        head = nd
    tail = nd
    size += 1


def pop_front():
    global head, tail, size
    nd = head
    head = nd.next
    if head is not None:
        head.prev = None
    else:
        tail = None
    size -= 1


def pop_back():
    global head, tail, size
    nd = tail
    tail = nd.prev
    if tail is not None:
        tail.next = None
    else:
        head = None
    size -= 1


def node_at(i):
    if i <= size // 2:
        cur = head
        for _ in range(i):
            cur = cur.next
    else:
        cur = tail
        for _ in range(size - 1 - i):
            cur = cur.prev
    return cur


for _ in range(q):
    op = data[pos]; pos += 1
    if op == b'push_front':
        push_front(int(data[pos])); pos += 1
    elif op == b'push_back':
        push_back(int(data[pos])); pos += 1
    elif op == b'pop_front':
        pop_front()
    elif op == b'pop_back':
        pop_back()
    elif op == b'insert':
        i = int(data[pos]); v = int(data[pos + 1]); pos += 2
        if i == 0:
            push_front(v)
        elif i == size:
            push_back(v)
        else:
            cur = node_at(i)
            nd = Node(v)
            nd.prev = cur.prev
            nd.next = cur
            cur.prev.next = nd
            cur.prev = nd
            size += 1
    else:  # erase
        i = int(data[pos]); pos += 1
        if i == 0:
            pop_front()
        elif i == size - 1:
            pop_back()
        else:
            cur = node_at(i)
            cur.prev.next = cur.next
            cur.next.prev = cur.prev
            size -= 1

out = []
t = head
while t is not None:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
