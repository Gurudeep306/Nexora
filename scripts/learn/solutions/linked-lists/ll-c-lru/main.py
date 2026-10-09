import sys

# Hashmap key->node plus a DOUBLY linked list ordered by recency:
# head side = most recent, tail side = least recent. Both ops O(1).


class Node:
    __slots__ = ('k', 'v', 'prev', 'next')

    def __init__(self, k, v):
        self.k = k
        self.v = v
        self.prev = None
        self.next = None


data = sys.stdin.buffer.read().split()
pos = 0
C = int(data[pos]); pos += 1
q = int(data[pos]); pos += 1

head = Node(0, 0)     # sentinels: no null checks anywhere
tail = Node(0, 0)
head.next = tail
tail.prev = head
mp = {}


def unlink(nd):
    nd.prev.next = nd.next
    nd.next.prev = nd.prev


def push_front(nd):   # mark most recently used
    nd.next = head.next
    nd.prev = head
    head.next.prev = nd
    head.next = nd


out = []
for _ in range(q):
    op = data[pos]; pos += 1
    if op == b'get':
        k = int(data[pos]); pos += 1
        nd = mp.get(k)
        if nd is None:
            out.append('-1')
        else:
            unlink(nd)          # two writes — why the list is doubly
            push_front(nd)
            out.append(str(nd.v))
    else:                       # put k v
        k = int(data[pos]); v = int(data[pos + 1]); pos += 2
        nd = mp.get(k)
        if nd is not None:      # update existing, mark recent
            nd.v = v
            unlink(nd)
            push_front(nd)
        else:
            nd = Node(k, v)
            mp[k] = nd
            push_front(nd)
            if len(mp) > C:     # evict LEAST recently used = tail side
                lru = tail.prev
                unlink(lru)
                del mp[lru.k]

sys.stdout.write('\n'.join(out) + ('\n' if out else ''))
