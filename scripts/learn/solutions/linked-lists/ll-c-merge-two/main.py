import sys

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


na = int(tokens[idx]); idx += 1
nb = int(tokens[idx]); idx += 1
a = read_list(na)
b = read_list(nb)

# merge by relinking: dummy + tail pointer
dummy = Node(0)
tail = dummy
while a and b:
    if a.v <= b.v:
        tail.next = a
        a = a.next
    else:
        tail.next = b
        b = b.next
    tail = tail.next
tail.next = a if a else b  # attach remainder whole

out = []
t = dummy.next
while t:
    out.append(str(t.v))
    t = t.next
print(' '.join(out) if out else 'EMPTY')
