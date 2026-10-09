# Linked lists judged problems, part 1 (exec'd by ../linked_lists.py)
# Pages: why-linked-lists, singly-linked, dummy-head, doubly-circular.
import random as _q1_r
from collections import Counter as _q1_Counter
from collections import OrderedDict as _q1_OrderedDict
from collections import deque as _q1_deque

_Q1_T = 'linked-lists'


def _q1_check(fast, brute, gen, rounds=300):
    for _ in range(rounds):
        s = gen()
        a, b = fast(s), brute(s)
        assert a == b, (s, a, b)


def _q1_list_input(n, vals, extra_before=''):
    """'n [extra]' on line 1, the n values head-first on line 2 (blank when n = 0)."""
    head = f"{n}" + (f" {extra_before}" if extra_before != '' else '')
    return head + "\n" + (' '.join(map(str, vals[:n])) if vals[:n] else '') + "\n"


def _q1_parse(s):
    """Returns (header_ints, values) from the standard two-line list input."""
    L = s.strip().split('\n')
    hdr = list(map(int, L[0].split()))
    vals = list(map(int, L[1].split())) if len(L) > 1 and L[1].strip() else []
    return hdr, vals


def _q1_out(vals):
    return ' '.join(map(str, vals)) if vals else 'EMPTY'


class _Node:
    __slots__ = ('v', 'next')

    def __init__(self, v, nxt=None):
        self.v = v
        self.next = nxt


def _q1_build(vals):
    head = None
    for v in reversed(vals):
        head = _Node(v, head)
    return head


def _q1_vals(head):
    out = []
    while head:
        out.append(head.v)
        head = head.next
    return out


# ═══════════════════════════ why-linked-lists ═══════════════════════════


def _q1_sol_op_sim(s):
    L = s.strip().split('\n')
    q = int(L[0])
    seq = _q1_deque()
    for line in L[1:1 + q]:
        parts = line.split()
        op = parts[0]
        if op == 'push_front':
            seq.appendleft(int(parts[1]))
        elif op == 'push_back':
            seq.append(int(parts[1]))
        elif op == 'insert':
            seq.insert(int(parts[1]), int(parts[2]))
        elif op == 'erase':
            del seq[int(parts[1])]
        elif op == 'pop_front':
            seq.popleft()
        else:
            seq.pop()
    return _q1_out(list(seq))


def _q1_gen_ops(q, ends_only=False, small_vals=False):
    """q always-valid operations on a sequence (mirrored in lockstep)."""
    seq = []
    ops = []
    lo, hi = (0, 9) if small_vals else (-10**9, 10**9)
    for _ in range(q):
        if ends_only:
            choices = ['push_front', 'push_back'] + (['pop_front', 'pop_back'] if seq else [])
        else:
            choices = ['push_front', 'push_back'] + (['erase', 'pop_front', 'pop_back', 'insert'] if seq else ['insert'])
        op = _q1_r.choice(choices)
        v = _q1_r.randint(lo, hi)
        if op == 'push_front':
            seq.insert(0, v)
            ops.append(f"push_front {v}")
        elif op == 'push_back':
            seq.append(v)
            ops.append(f"push_back {v}")
        elif op == 'insert':
            i = _q1_r.randint(0, len(seq))
            seq.insert(i, v)
            ops.append(f"insert {i} {v}")
        elif op == 'erase':
            i = _q1_r.randint(0, len(seq) - 1)
            del seq[i]
            ops.append(f"erase {i}")
        elif op == 'pop_front':
            seq.pop(0)
            ops.append('pop_front')
        else:
            seq.pop()
            ops.append('pop_back')
    return f"{q}\n" + '\n'.join(ops) + '\n'


_q1_check(_q1_sol_op_sim, _q1_sol_op_sim, lambda: _q1_gen_ops(_q1_r.randint(1, 8)))

add('ll-c-op-sim', 'A sequence of splices', _Q1_T, 'why-linked-lists', 800,
    ['linked lists', 'simulation', 'design'],
    '<p>Run a sequence of list operations and print the final contents. Four of them are the ones a linked list does in O(1) once you hold the right node — <code>push_front</code>, <code>pop_front</code>, <code>insert i v</code> (splice before position i), <code>erase i</code> — and two are the ones a singly list without a tail pointer does NOT: <code>push_back</code> and <code>pop_back</code>. A real implementation keeps head AND tail pointers so all six are cheap at the ends; with 2·10<sup>5</sup> operations, any implementation that walks the list per end-operation is quadratic and will not finish.</p>'
    '<p>All operations are guaranteed valid (no pop/erase on an empty list; <code>insert i</code> has 0 ≤ i ≤ length; <code>erase i</code> has 0 ≤ i &lt; length).</p>',
    '<p>The first line contains q (1 ≤ q ≤ 2·10<sup>5</sup>), the number of operations. Each of the next q lines is one operation: <code>push_front v</code>, <code>push_back v</code>, <code>insert i v</code>, <code>erase i</code>, <code>pop_front</code> or <code>pop_back</code> (|v| ≤ 10<sup>9</sup>).</p>',
    '<p>One line: the final values, front first, separated by spaces — or <code>EMPTY</code> if the list is empty.</p>',
    _q1_sol_op_sim,
    ["7\npush_back 1\npush_back 2\npush_front 0\ninsert 2 5\nerase 1\npop_back\npush_back 9\n"],
    ["1\npush_front 7\n", "4\npush_back 1\npop_front\npush_back 2\npop_back\n",
     "6\npush_front 3\npush_front 2\npush_front 1\nerase 1\nerase 1\nerase 0\n"],
    lambda: _q1_gen_ops(_q1_r.randint(1, 40)), n_rand=6,
    large=lambda: _q1_gen_ops(15000, ends_only=True, small_vals=True))


# ═══════════════════════════ singly-linked ═══════════════════════════


def _q1_sol_bin_to_int(s):
    hdr, vals = _q1_parse(s)
    acc = 0
    for b in vals:
        acc = acc * 2 + b
    return str(acc)


def _q1_brute_bin_to_int(s):
    bits = ''.join(map(str, _q1_parse(s)[1]))
    return str(int(bits, 2))


_q1_check(_q1_sol_bin_to_int, _q1_brute_bin_to_int,
          lambda: (lambda n: _q1_list_input(n, [_q1_r.randint(0, 1) for _ in range(n)]))(_q1_r.randint(1, 12)))

add('ll-c-bin-to-int', 'Binary number in a list', _Q1_T, 'singly-linked', 800,
    ['linked lists', 'traversal'],
    '<p>The list holds the bits of a binary number, MOST significant bit at the head (1→0→1 is 5). Return its decimal value.</p>'
    '<p>One traversal, folding as you walk: <code>acc = acc * 2 + bit</code> per node — no second pass, no reversal. With up to 60 bits the answer can exceed 2<sup>31</sup>: use a 64-bit accumulator (C/C++ <code>long long</code>, Java <code>long</code>, JavaScript <code>BigInt</code>).</p>',
    '<p>The first line contains n (1 ≤ n ≤ 60). The second line contains n values, each 0 or 1.</p>',
    '<p>One integer: the decimal value.</p>',
    _q1_sol_bin_to_int,
    [_q1_list_input(3, [1, 0, 1]), _q1_list_input(4, [0, 0, 0, 0]), _q1_list_input(5, [1, 0, 0, 1, 0])],
    [_q1_list_input(1, [0]), _q1_list_input(1, [1]), _q1_list_input(60, [1] * 60), _q1_list_input(60, [1] + [0] * 59)],
    lambda: (lambda n: _q1_list_input(n, [_q1_r.randint(0, 1) for _ in range(n)]))(_q1_r.randint(1, 60)), n_rand=6)


def _q1_sol_delete_node(s):
    hdr, vals = _q1_parse(s)
    idx = hdr[1]
    # LC 237 with only the node itself: steal the successor's value, unlink
    # the successor. Net effect on the value sequence: position idx is gone.
    del vals[idx]
    return _q1_out(vals)


_q1_check(_q1_sol_delete_node, _q1_sol_delete_node,
          lambda: (lambda n: (lambda i: _q1_list_input(n, [_q1_r.randint(1, 99) for _ in range(n)], i))(
              _q1_r.randint(0, n - 2)))(_q1_r.randint(2, 12)))

add('ll-c-delete-node', 'Delete with no way back', _Q1_T, 'singly-linked', 1200,
    ['linked lists', 'tricky'],
    '<p>Delete the node at position idx — but pretend you hold ONLY a pointer to that node: no head, no predecessor, and a singly list gives you no way to find one. This is the classic trick question.</p>'
    '<p>You cannot unlink the node you hold, but you CAN remove its SUCCESSOR and steal its contents: copy <code>node.next.val</code> into the node, then bypass <code>node.next</code>. From the outside the value sequence loses position idx, which is what you print. The given node is never the tail, so a successor always exists.</p>'
    '<p>Say the caveats out loud in an interview: this mutates values, so it breaks when anything else holds a pointer to the successor or satellite data rides along — and in C/C++ the bypassed node must still be freed.</p>',
    '<p>The first line contains n and idx (2 ≤ n ≤ 10<sup>4</sup>, 0 ≤ idx ≤ n−2). The second line contains the n values.</p>',
    '<p>One line: the n−1 remaining values, head first.</p>',
    _q1_sol_delete_node,
    ["5 1\n4 5 1 9 3\n", "4 0\n1 2 3 4\n"],
    ["3 1\n7 7 7\n", "2 0\n5 6\n"],
    lambda: (lambda n: (lambda i: _q1_list_input(n, [_q1_r.randint(-1000, 1000) for _ in range(n)], i))(
        _q1_r.randint(0, n - 2)))(_q1_r.randint(2, 60)), n_rand=6)


def _q1_sol_design_list(s):
    L = s.strip().split('\n')
    q = int(L[0])
    seq = []
    out = []
    for line in L[1:1 + q]:
        parts = line.split()
        op = parts[0]
        if op == 'get':
            i = int(parts[1])
            out.append(str(seq[i]) if 0 <= i < len(seq) else '-1')
        elif op == 'addAtHead':
            seq.insert(0, int(parts[1]))
        elif op == 'addAtTail':
            seq.append(int(parts[1]))
        elif op == 'addAtIndex':
            i, v = int(parts[1]), int(parts[2])
            if i < 0:
                i = 0
            if i <= len(seq):
                seq.insert(i, v)
        else:
            i = int(parts[1])
            if 0 <= i < len(seq):
                del seq[i]
    return '\n'.join(out)


def _q1_gen_design(q):
    seq = []
    ops = []
    for _ in range(q):
        t = _q1_r.random()
        if t < 0.25:
            i = _q1_r.randint(-1, max(len(seq), 1))
            ops.append(f"get {i}")
        elif t < 0.45:
            ops.append(f"addAtHead {_q1_r.randint(0, 100)}")
            seq.insert(0, int(ops[-1].split()[1]))
        elif t < 0.65:
            ops.append(f"addAtTail {_q1_r.randint(0, 100)}")
            seq.append(int(ops[-1].split()[1]))
        elif t < 0.85:
            i = _q1_r.randint(-1, len(seq) + 1)
            v = _q1_r.randint(0, 100)
            ops.append(f"addAtIndex {i} {v}")
            if i < 0:
                i = 0
            if i <= len(seq):
                seq.insert(i, v)
        else:
            i = _q1_r.randint(-1, max(len(seq), 1))
            ops.append(f"deleteAtIndex {i}")
            if 0 <= i < len(seq):
                del seq[i]
    return f"{q}\n" + '\n'.join(ops) + '\n'


_q1_check(_q1_sol_design_list, _q1_sol_design_list, lambda: _q1_gen_design(_q1_r.randint(1, 10)))

add('ll-c-design-list', 'Design a linked list', _Q1_T, 'singly-linked', 1300,
    ['linked lists', 'design', 'dummy head'],
    '<p>Implement a list with five operations: <code>get i</code>, <code>addAtHead v</code>, <code>addAtTail v</code>, <code>addAtIndex i v</code>, <code>deleteAtIndex i</code>. This is where the page\'s pieces become one program: a <b>dummy head</b> so add/delete never special-case the head, a <b>tail pointer</b> so addAtTail is two writes instead of an O(n) walk, and a <b>size counter</b> so bad indexes are rejected in O(1).</p>'
    '<p>Rules (the standard ones): <code>get</code> on an out-of-range index returns −1; <code>addAtIndex</code> with i &gt; length is ignored, i = length appends, i ≤ 0 inserts at the front; <code>deleteAtIndex</code> on an out-of-range index is ignored.</p>',
    '<p>The first line contains q (1 ≤ q ≤ 2000), the number of calls. Each of the next q lines is one call, exactly as named above (0 ≤ v ≤ 1000; indexes are 32-bit ints and may be negative or larger than the length).</p>',
    '<p>One line per <code>get</code> call: its result.</p>',
    _q1_sol_design_list,
    ["8\naddAtHead 1\naddAtTail 3\naddAtIndex 1 2\nget 1\nget 5\ndeleteAtIndex 1\nget 1\nget -1\n"],
    ["1\nget 0\n", "5\ndeleteAtIndex 0\naddAtIndex 5 1\nget 0\naddAtIndex -1 4\nget 0\n"],
    lambda: _q1_gen_design(_q1_r.randint(1, 30)), n_rand=6)


# ═══════════════════════════ dummy head ═══════════════════════════


def _q1_sol_remove_val(s):
    hdr, vals = _q1_parse(s)
    x = hdr[1]
    return _q1_out([v for v in vals if v != x])


_q1_check(_q1_sol_remove_val, _q1_sol_remove_val,
          lambda: (lambda n, x: _q1_list_input(n, [_q1_r.choice([x, _q1_r.randint(1, 9)]) for _ in range(n)], x))(
              _q1_r.randint(0, 12), _q1_r.randint(1, 9)))

add('ll-c-remove-val', 'Remove every x', _Q1_T, 'dummy-head', 900,
    ['linked lists', 'dummy head'],
    '<p>Delete every node whose value equals x and print the survivors. The head itself may be a victim — possibly several in a row ([1,1,1,2] with x = 1 leaves [2]) — which is exactly the case the <b>dummy head</b> eliminates: anchor a sentinel before the head, walk with <code>prev</code>, unlink <code>prev.next</code> when it matches, and crucially do NOT advance prev after an unlink (every new <code>prev.next</code> is unexamined). Return <code>dummy.next</code>, never the original head.</p>',
    '<p>The first line contains n and x (0 ≤ n ≤ 10<sup>4</sup>, |x| ≤ 10<sup>4</sup>). The second line contains the n values (blank when n = 0).</p>',
    '<p>One line: the surviving values head first, or <code>EMPTY</code>.</p>',
    _q1_sol_remove_val,
    ["7 6\n1 2 6 3 4 5 6\n", "3 1\n1 1 1\n", "0 5\n\n"],
    ["1 1\n1\n", "4 2\n2 2 2 2\n", "5 0\n0 1 0 2 0\n"],
    lambda: (lambda n, x: _q1_list_input(n, [_q1_r.choice([x, _q1_r.randint(-20, 20)]) for _ in range(n)], x))(
        _q1_r.randint(0, 40), _q1_r.randint(-20, 20)), n_rand=6)


def _q1_sol_insert_sorted(s):
    hdr, vals = _q1_parse(s)
    x = hdr[1]
    i = 0
    while i < len(vals) and vals[i] <= x:   # ties go AFTER equals — stable
        i += 1
    vals.insert(i, x)
    return _q1_out(vals)


_q1_check(_q1_sol_insert_sorted, _q1_sol_insert_sorted,
          lambda: (lambda n, x: _q1_list_input(n, sorted(_q1_r.randint(-20, 20) for _ in range(n)), x))(
              _q1_r.randint(0, 10), _q1_r.randint(-20, 20)))

add('ll-c-insert-sorted', 'Insert into a sorted list', _Q1_T, 'dummy-head', 1000,
    ['linked lists', 'dummy head', 'sorted'],
    '<p>Insert x into a non-decreasing list so it stays sorted, and print the result. Equal values: x goes AFTER the existing equals — the stable choice, the same tie rule the merge on the merging page uses.</p>'
    '<p>The walk stops at the first node that is NOT ≤ x; a −∞-valued dummy makes "x is the new head" fall out of the same loop with no branch. On a list, finding the spot is O(n) but the splice itself is two writes — an array would also shift O(n) elements.</p>',
    '<p>The first line contains n and x (0 ≤ n ≤ 10<sup>4</sup>, |x| ≤ 10<sup>9</sup>). The second line contains the n values in non-decreasing order.</p>',
    '<p>One line: the n+1 values of the resulting list.</p>',
    _q1_sol_insert_sorted,
    ["5 4\n1 2 3 5 8\n", "0 7\n\n", "3 0\n0 0 0\n"],
    ["4 -5\n-3 0 2 9\n", "4 100\n-3 0 2 9\n", "1 5\n5\n"],
    lambda: (lambda n, x: _q1_list_input(n, sorted(_q1_r.randint(-50, 50) for _ in range(n)), x))(
        _q1_r.randint(0, 30), _q1_r.randint(-50, 50)), n_rand=6)


def _q1_sol_remove_dups2(s):
    hdr, vals = _q1_parse(s)
    c = _q1_Counter(vals)
    return _q1_out([v for v in vals if c[v] == 1])


def _q1_brute_remove_dups2(s):
    """The prev/dummy one-pass the page teaches, simulated on nodes."""
    hdr, vals = _q1_parse(s)
    dummy = _Node(0, _q1_build(vals))
    prev = dummy
    while prev.next:
        if prev.next.next and prev.next.v == prev.next.next.v:
            v = prev.next.v
            while prev.next and prev.next.v == v:
                prev.next = prev.next.next
        else:
            prev = prev.next
    return _q1_out(_q1_vals(dummy.next))


_q1_check(_q1_sol_remove_dups2, _q1_brute_remove_dups2,
          lambda: _q1_list_input(_q1_r.randint(0, 12), sorted(_q1_r.randint(1, 6) for _ in range(12))))

add('ll-c-remove-dups-II', 'Delete every value that repeats', _Q1_T, 'dummy-head', 1200,
    ['linked lists', 'dummy head', 'sorted'],
    '<p>The list is sorted and may contain duplicates. Delete EVERY node whose value appears more than once — [1,2,2,3,3,4] becomes [1,4]. Contrast with keep-one dedup (the two-lists page): here the head itself can be a victim, so the dummy head is mandatory, and the loop must skip whole RUNS of equal values: when <code>prev.next.val == prev.next.next.val</code>, remember that value and unlink forward until a different value appears — prev never enters a run.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values in non-decreasing order.</p>',
    '<p>One line: the surviving values, or <code>EMPTY</code>.</p>',
    _q1_sol_remove_dups2,
    ["6\n1 2 2 3 3 4\n", "5\n1 1 1 2 3\n", "0\n\n"],
    ["3\n2 2 2\n", "1\n5\n", "8\n1 1 2 2 3 3 4 4\n"],
    lambda: _q1_list_input(_q1_r.randint(0, 40), sorted(_q1_r.randint(-30, 30) for _ in range(40))), n_rand=6)


def _q1_sol_zero_sum(s):
    """Prefix sums with LAST-occurrence storage — the standard O(n) method."""
    hdr, vals = _q1_parse(s)
    dummy = _Node(0, _q1_build(vals))
    seen = {0: dummy}
    pre = 0
    cur = dummy.next
    while cur:
        pre += cur.v
        seen[pre] = cur
        cur = cur.next
    cur = dummy
    pre = 0
    while cur:
        pre += cur.v
        cur.next = seen[pre].next
        cur = cur.next
    return _q1_out(_q1_vals(dummy.next))


def _q1_brute_zero_sum(s):
    """Leftmost-shortest zero-sum run, removed repeatedly."""
    hdr, a = _q1_parse(s)
    a = list(a)
    while True:
        found = None
        for i in range(len(a)):
            tot = 0
            for j in range(i, len(a)):
                tot += a[j]
                if tot == 0:
                    found = (i, j)
                    break
            if found:
                break
        if not found:
            return _q1_out(a)
        i, j = found
        a = a[:i] + a[j + 1:]


_q1_check(_q1_sol_zero_sum, _q1_brute_zero_sum,
          lambda: _q1_list_input(_q1_r.randint(0, 9), [_q1_r.randint(-4, 4) for _ in range(9)]))

add('ll-c-remove-zero-sum', 'Erase consecutive runs summing to zero', _Q1_T, 'dummy-head', 1700,
    ['linked lists', 'dummy head', 'prefix sums', 'hash map'],
    '<p>Delete consecutive runs of nodes that sum to zero, repeatedly, until no run remains. Which run you remove first does not change the final list — [5,2,−3,−3,1] ends as [5,1] and [1,2,3,−3,−2] ends as [1] whichever valid run goes first.</p>'
    '<p>The O(n) method rides on a dummy head and prefix sums: with a sentinel anchoring prefix 0, "a run sums to zero" becomes "two prefix sums are equal" — everything between those two nodes vanishes. Pass 1 walks the list storing the LAST node reaching each prefix sum in a hash map (prefix 0 maps to the dummy). Pass 2 walks again and, at each node whose prefix is p, sets <code>node.next = seen[p].next</code> — jumping over every zero-sum run that ends later. Last-occurrence storage is what makes the jumps compose when runs nest or touch.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 1000). The second line contains the n values (|value| ≤ 1000).</p>',
    '<p>One line: the surviving values, or <code>EMPTY</code>.</p>',
    _q1_sol_zero_sum,
    ["5\n5 2 -3 -3 1\n", "4\n1 2 -3 3\n", "5\n1 2 3 -3 -2\n"],
    ["0\n\n", "3\n0 0 0\n", "2\n1 -1\n", "6\n3 1 -1 -3 2 -2\n"],
    lambda: _q1_list_input(_q1_r.randint(0, 30), [_q1_r.randint(-9, 9) for _ in range(30)]), n_rand=6,
    large=lambda: _q1_list_input(20000, [_q1_r.randint(-1000, 1000) for _ in range(20000)]))


# ═══════════════════════════ doubly & circular ═══════════════════════════


def _q1_sol_josephus(s):
    L = s.strip().split('\n')
    t = int(L[0])
    out = []
    for line in L[1:1 + t]:
        n, k = map(int, line.split())
        seat = 0
        for size in range(2, n + 1):
            seat = (seat + k) % size
        out.append(str(seat + 1))
    return '\n'.join(out)


def _q1_brute_josephus(s):
    L = s.strip().split('\n')
    t = int(L[0])
    out = []
    for line in L[1:1 + t]:
        n, k = map(int, line.split())
        ring = list(range(1, n + 1))
        i = 0
        while len(ring) > 1:
            i = (i + k - 1) % len(ring)
            ring.pop(i)
        out.append(str(ring[0]))
    return '\n'.join(out)


_q1_check(_q1_sol_josephus, _q1_brute_josephus,
          lambda: "3\n" + '\n'.join(f"{_q1_r.randint(1, 12)} {_q1_r.randint(1, 9)}" for _ in range(3)) + '\n')

add('ll-c-josephus', 'Josephus ring', _Q1_T, 'doubly-circular', 1300,
    ['linked lists', 'circular', 'simulation', 'math'],
    '<p>n people numbered 1…n stand in a ring. Counting starts at person 1; every k-th person is eliminated, counting resumes right after each elimination, and the ring closes over the gap. Print the survivor\'s number.</p>'
    '<p>A circular list simulates this literally: k−1 hops, unlink, continue — O(n·k) hops. The O(n) recurrence does it with no structure at all: <code>seat(1) = 0; seat(m) = (seat(m−1) + k) mod m</code> for m = 2…n; survivor = seat(n) + 1. With k up to 10<sup>9</sup> and n up to 10<sup>5</sup>, only the recurrence finishes in time — the simulation would need up to n·k hops.</p>',
    '<p>The first line contains T (1 ≤ T ≤ 10). Each of the next T lines contains n and k (1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ k ≤ 10<sup>9</sup>).</p>',
    '<p>T lines: the survivor\'s number (1-based).</p>',
    _q1_sol_josephus,
    ["3\n7 3\n10 2\n5 5\n"],
    ["1\n1 1\n", "4\n1 7\n2 1000000000\n3 1\n40 1\n"],
    lambda: f"{_q1_r.randint(1, 5)}\n" + '\n'.join(
        f"{_q1_r.randint(1, 300)} {_q1_r.randint(1, 10**9)}" for _ in range(5)) + '\n', n_rand=5,
    large=lambda: "5\n" + '\n'.join(f"100000 {_q1_r.randint(1, 10**9)}" for _ in range(5)) + '\n')


def _q1_sol_josephus_k2(s):
    L = s.strip().split('\n')
    t = int(L[0])
    out = []
    for line in L[1:1 + t]:
        n = int(line)
        p = 1
        while p * 2 <= n:
            p *= 2
        out.append(str(2 * (n - p) + 1))
    return '\n'.join(out)


def _q1_brute_josephus_k2(s):
    L = s.strip().split('\n')
    t = int(L[0])
    out = []
    for line in L[1:1 + t]:
        n = int(line)
        ring = list(range(1, n + 1))
        i = 0
        while len(ring) > 1:
            i = (i + 1) % len(ring)   # k = 2: skip one, remove the next
            ring.pop(i)
        out.append(str(ring[0]))
    return '\n'.join(out)


_q1_check(_q1_sol_josephus_k2, _q1_brute_josephus_k2,
          lambda: "4\n" + '\n'.join(str(_q1_r.randint(1, 30)) for _ in range(4)) + '\n')

add('ll-c-josephus-k2', 'Josephus with k = 2, n up to 10^18', _Q1_T, 'doubly-circular', 1300,
    ['circular', 'math', 'bit manipulation'],
    '<p>The Josephus ring with k = 2 (every second person goes), but n can reach 10<sup>18</sup> — neither the simulation nor even the O(n) recurrence finishes. Use the closed form from the page: write n = 2<sup>m</sup> + l with 0 ≤ l &lt; 2<sup>m</sup>; the survivor is 2l + 1. Equivalently: rotate n\'s binary representation left by one bit (the leading 1 moves to the end). Powers of two are the elegant edge: l = 0, so person 1 always survives.</p>',
    '<p>The first line contains T (1 ≤ T ≤ 10<sup>4</sup>). Each of the next T lines contains n (1 ≤ n ≤ 10<sup>18</sup>).</p>',
    '<p>T lines: the survivor\'s number (1-based).</p>',
    _q1_sol_josephus_k2,
    ["4\n10\n7\n1\n8\n"],
    ["2\n2\n3\n", "3\n1000000000000000000\n999999999999999999\n576460752303423488\n"],
    lambda: f"{_q1_r.randint(1, 8)}\n" + '\n'.join(str(_q1_r.randint(1, 10**18)) for _ in range(8)) + '\n', n_rand=5)


def _q1_sol_insert_circular(s):
    """First-valid-pair rule; see the statement for the exact semantics."""
    hdr, vals = _q1_parse(s)
    n, x = hdr[0], hdr[1]
    if n == 0:
        return str(x)
    at = -1
    for i in range(n):
        a, b = vals[i], vals[(i + 1) % n]
        if (a <= x <= b) or (a > b and (x >= a or x <= b)):
            at = i
            break
    if at == -1:            # every value equal and x differs — after H
        at = 0
    vals.insert(at + 1, x)  # at+1 <= n always, so a plain insert is the ring splice
    return ' '.join(map(str, vals))


def _q1_gen_circular_ring():
    """A true rotation of a sorted array (cyclically non-decreasing)."""
    n = _q1_r.randint(0, 20)
    vals = sorted(_q1_r.randint(-10, 10) for _ in range(n))
    if n:
        r = _q1_r.randint(0, n - 1)
        vals = vals[r:] + vals[:r]
    x = _q1_r.randint(-12, 12)
    return _q1_list_input(n, vals, x)


def _q1_brute_insert_circular(s):
    """Same rule executed on a real node ring via pointer surgery."""
    hdr, vals = _q1_parse(s)
    n, x = hdr[0], hdr[1]
    if n == 0:
        return str(x)
    ring = [_Node(v) for v in vals]
    for i in range(n):
        ring[i].next = ring[(i + 1) % n]
    h = ring[0]
    p = h
    target = None
    while True:
        a, b = p.v, p.next.v
        if (a <= x <= b) or (a > b and (x >= a or x <= b)):
            target = p
            break
        p = p.next
        if p is h:
            break
    if target is None:
        target = h
    new = _Node(x, target.next)
    target.next = new
    out = []
    p = h
    for _ in range(n + 1):
        out.append(p.v)
        p = p.next
    return ' '.join(map(str, out))


_q1_check(_q1_sol_insert_circular, _q1_brute_insert_circular, _q1_gen_circular_ring)

add('ll-c-insert-circular', 'Insert into a sorted circular list', _Q1_T, 'doubly-circular', 1300,
    ['linked lists', 'circular', 'sorted'],
    '<p>A sorted list was closed into a ring and handed to you starting at an arbitrary node H — so what you see is a ROTATION of a sorted order (3→4→1→2, say). Insert x so the ring stays sorted, and print the ring starting at H again.</p>'
    '<p>To make the answer unique, follow this rule. Walk ONE lap from H, examining each adjacent pair (a, b) in order, INCLUDING the wrap-around pair (last node, H). Insert x into the FIRST pair that qualifies: either <code>a ≤ x ≤ b</code>, or the pair is the seam (<code>a &gt; b</code>, where the maximum meets the minimum) and <code>x ≥ a</code> or <code>x ≤ b</code> — that covers "x is the new maximum" and "x is the new minimum" at once. If no pair qualifies (only possible when all values are equal), insert immediately after H.</p>'
    '<p>The pointer version is the classic one-lap walk: the ring has no null, so the stop rule is identity against H or a counter — never a null test — exactly as the page says.</p>',
    '<p>The first line contains n and x (0 ≤ n ≤ 10<sup>4</sup>, |x| ≤ 10<sup>9</sup>). The second line contains the ring\'s n values starting at H — a rotation of a non-decreasing sequence (blank when n = 0).</p>',
    '<p>One line: the n+1 values of the ring, starting at H.</p>',
    _q1_sol_insert_circular,
    ["4 2\n3 4 1 2\n", "0 5\n\n", "3 0\n1 1 1\n", "4 9\n3 4 1 2\n"],
    ["2 9\n1 3\n", "2 -9\n1 3\n", "4 3\n3 3 3 3\n", "1 5\n5\n", "1 4\n5\n"],
    _q1_gen_circular_ring, n_rand=6,
    large=lambda: (lambda n: (lambda vals: (lambda r: _q1_list_input(n, vals[r:] + vals[:r], _q1_r.randint(0, 9)))(
        _q1_r.randint(0, n - 1)))(sorted(_q1_r.randint(0, 9) for _ in range(n))))(20000))


def _q1_sol_browser(s):
    L = s.strip().split('\n')
    home = L[0]
    q = int(L[1])
    hist = [home]
    pos = 0
    out = []
    for line in L[2:2 + q]:
        parts = line.split()
        op = parts[0]
        if op == 'visit':
            del hist[pos + 1:]
            hist.append(parts[1])
            pos += 1
        elif op == 'back':
            pos = max(0, pos - int(parts[1]))
            out.append(hist[pos])
        else:
            pos = min(len(hist) - 1, pos + int(parts[1]))
            out.append(hist[pos])
    return '\n'.join(out)


def _q1_gen_browser(q):
    hist = ['home']
    pos = 0
    ops = []
    for _ in range(q):
        t = _q1_r.random()
        if t < 0.5:
            url = f"p{_q1_r.randint(1, 6)}"
            del hist[pos + 1:]
            hist.append(url)
            pos += 1
            ops.append(f"visit {url}")
        elif t < 0.8:
            k = _q1_r.randint(1, 4)
            pos = max(0, pos - k)
            ops.append(f"back {k}")
        else:
            k = _q1_r.randint(1, 4)
            pos = min(len(hist) - 1, pos + k)
            ops.append(f"forward {k}")
    return 'home\n' + f"{q}\n" + '\n'.join(ops) + '\n'


_q1_check(_q1_sol_browser, _q1_sol_browser, lambda: _q1_gen_browser(_q1_r.randint(1, 12)))

add('ll-c-browser-history', 'Browser history', _Q1_T, 'doubly-circular', 1300,
    ['linked lists', 'doubly', 'design'],
    '<p>Design a browser-history structure: <code>visit url</code> opens a page and destroys ALL forward history; <code>back k</code> and <code>forward k</code> move up to k steps, stopping at the ends. Print the URL each back/forward lands on.</p>'
    '<p>The intended structure is a cursor inside a DOUBLY linked list: back/forward are prev/next hops, and visit-unlinks-forward is where doubly shines — unlinking the successors of a held cursor and splicing in a new node are O(1) with prev+next, while a singly list cannot even walk backwards. (An array plus a cursor index also passes; be ready to say why the list is the design answer: O(1) splice at a held node, unbounded growth without reallocation copies.)</p>',
    '<p>The first line is the starting URL. The second line contains q (1 ≤ q ≤ 2000). Each of the next q lines is <code>visit url</code>, <code>back k</code> or <code>forward k</code> (URLs are lowercase alphanumeric; 1 ≤ k ≤ 100).</p>',
    '<p>One line per back/forward call: the URL it lands on.</p>',
    _q1_sol_browser,
    ["home\n9\nvisit a\nvisit b\nback 1\nvisit c\nforward 2\nback 2\nback 1\nforward 1\nvisit d\n"],
    ["home\n2\nback 5\nforward 5\n", "home\n3\nvisit a\nback 1\nforward 1\n"],
    lambda: _q1_gen_browser(_q1_r.randint(1, 40)), n_rand=6)


def _q1_sol_lru(s):
    L = s.strip().split('\n')
    cap = int(L[0])
    q = int(L[1])
    cache = _q1_OrderedDict()
    out = []
    for line in L[2:2 + q]:
        parts = line.split()
        if parts[0] == 'get':
            k = int(parts[1])
            if k in cache:
                cache.move_to_end(k)
                out.append(str(cache[k]))
            else:
                out.append('-1')
        else:
            k, v = int(parts[1]), int(parts[2])
            if k in cache:
                cache.move_to_end(k)
            cache[k] = v
            if len(cache) > cap:
                cache.popitem(last=False)
    return '\n'.join(out)


def _q1_gen_lru(q, cap):
    ops = []
    for _ in range(q):
        if _q1_r.random() < 0.4:
            ops.append(f"get {_q1_r.randint(0, 9)}")
        else:
            ops.append(f"put {_q1_r.randint(0, 9)} {_q1_r.randint(0, 99)}")
    return f"{cap}\n{q}\n" + '\n'.join(ops) + '\n'


_q1_check(_q1_sol_lru, _q1_sol_lru, lambda: _q1_gen_lru(_q1_r.randint(1, 15), _q1_r.randint(1, 4)))

add('ll-c-lru', 'LRU cache', _Q1_T, 'doubly-circular', 1700,
    ['linked lists', 'doubly', 'hash map', 'design'],
    '<p>Design a least-recently-used cache with capacity C: <code>get k</code> returns the value (or −1) and marks k most recently used; <code>put k v</code> inserts or updates and marks k most recently used, evicting the LEAST recently used entry when capacity is exceeded. Both operations must be O(1).</p>'
    '<p>The canonical structure is this page\'s endpoint: a hashmap key→node plus a DOUBLY linked list ordered by recency. Get: map lookup, then unlink-and-push-front on the held node — two writes, which is exactly why the list must be doubly (a singly list needs an O(n) walk to find the predecessor). Put on a full cache: drop the tail (O(1) only with prev pointers) and erase its key from the map. Standard libraries hand you the recency list for free (Python <code>OrderedDict</code>, Java <code>LinkedHashMap</code> with accessOrder) — using one is fine, but be ready to draw the map+doubly-list version, because that is the follow-up.</p>',
    '<p>The first line contains C (1 ≤ C ≤ 100). The second line contains q (1 ≤ q ≤ 2000). Each of the next q lines is <code>get k</code> or <code>put k v</code> (0 ≤ k ≤ 100, 0 ≤ v ≤ 10<sup>4</sup>).</p>',
    '<p>One line per <code>get</code>: its result.</p>',
    _q1_sol_lru,
    ["2\n9\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4\n"],
    ["1\n5\nput 1 1\nput 1 2\nget 1\nput 2 3\nget 1\n", "3\n2\nget 5\nput 5 7\n"],
    lambda: _q1_gen_lru(_q1_r.randint(1, 40), _q1_r.randint(1, 5)), n_rand=6)
