import sys

# Cursor inside a DOUBLY linked list: back/forward are prev/next hops,
# and visit-unlinks-forward is O(1) with prev+next in hand.


class Node:
    __slots__ = ('url', 'prev', 'next')

    def __init__(self, url):
        self.url = url
        self.prev = None
        self.next = None


lines = sys.stdin.buffer.read().decode().split('\n')
cur = Node(lines[0].strip())
q = int(lines[1])

out = []
for i in range(2, 2 + q):
    parts = lines[i].split()
    op = parts[0]
    if op == 'visit':
        nd = Node(parts[1])
        nd.prev = cur
        cur.next = nd              # forward history is simply dropped
        cur = nd                   # (unreachable, no unlinking needed)
    elif op == 'back':
        k = int(parts[1])
        while k > 0 and cur.prev is not None:
            cur = cur.prev
            k -= 1
        out.append(cur.url)
    else:                          # forward
        k = int(parts[1])
        while k > 0 and cur.next is not None:
            cur = cur.next
            k -= 1
        out.append(cur.url)

sys.stdout.write('\n'.join(out) + ('\n' if out else ''))
