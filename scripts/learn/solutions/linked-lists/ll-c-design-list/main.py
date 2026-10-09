import sys

# Dummy head so add/delete never special-case the head, tail pointer so
# addAtTail is two writes, size counter so bad indexes die in O(1).


class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v, nxt=None):
        self.v = v
        self.next = nxt


data = sys.stdin.buffer.read().split()
pos = 0
q = int(data[pos]); pos += 1

dummy = Node(0)
tail = dummy      # tail is dummy means the list is empty
size = 0


def node_before(i):
    """node whose next is position i"""
    cur = dummy
    for _ in range(i):
        cur = cur.next
    return cur


out = []
for _ in range(q):
    op = data[pos]; pos += 1
    if op == b'get':
        i = int(data[pos]); pos += 1
        r = -1
        if 0 <= i < size:
            cur = dummy
            for _ in range(i + 1):
                cur = cur.next
            r = cur.v
        out.append(str(r))
    elif op == b'addAtHead':
        v = int(data[pos]); pos += 1
        dummy.next = Node(v, dummy.next)
        if size == 0:
            tail = dummy.next
        size += 1
    elif op == b'addAtTail':
        v = int(data[pos]); pos += 1
        tail.next = Node(v)
        tail = tail.next
        size += 1
    elif op == b'addAtIndex':
        i = int(data[pos]); v = int(data[pos + 1]); pos += 2
        if i <= 0:                  # front (also covers negatives)
            dummy.next = Node(v, dummy.next)
            if size == 0:
                tail = dummy.next
            size += 1
        elif i == size:             # append
            tail.next = Node(v)
            tail = tail.next
            size += 1
        elif i < size:              # interior splice after node i-1
            prev = node_before(i)
            prev.next = Node(v, prev.next)
            size += 1
        # i > size: ignored
    else:                           # deleteAtIndex
        i = int(data[pos]); pos += 1
        if 0 <= i < size:
            prev = node_before(i)
            victim = prev.next
            prev.next = victim.next
            if victim == tail:
                tail = prev
            size -= 1

sys.stdout.write('\n'.join(out) + ('\n' if out else ''))
