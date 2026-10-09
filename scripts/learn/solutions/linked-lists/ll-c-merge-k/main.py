import sys
import heapq

class Node:
    __slots__ = ('v', 'next')

    def __init__(self, v):
        self.v = v
        self.next = None


tokens = sys.stdin.buffer.read().split()
idx = 0


def read_list(n):
    global idx
    dummy = Node(0)
    tail = dummy
    for _ in range(n):
        tail.next = Node(int(tokens[idx]))
        idx += 1
        tail = tail.next
    return dummy.next


k = int(tokens[idx]); idx += 1

# min-heap of the K current heads; counter breaks ties (nodes aren't comparable)
heap = []
ctr = 0
for _ in range(k):
    ni = int(tokens[idx]); idx += 1
    h = read_list(ni)
    if h:
        heapq.heappush(heap, (h.v, ctr, h))
        ctr += 1

dummy = Node(0)
tail = dummy
while heap:
    _, _, m = heapq.heappop(heap)
    tail.next = m  # relink, no copying
    tail = m
    if m.next:
        heapq.heappush(heap, (m.next.v, ctr, m.next))
        ctr += 1

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
