# Linked lists judged problems, part 2 (exec'd by ../linked_lists.py)
# Pages: reversal, fast-slow-pointers, cycle-detection, palindrome-halves.
import random as _q2_r

_Q2_T = 'linked-lists'


def _q2_check(fast, brute, gen, rounds=300):
    for _ in range(rounds):
        s = gen()
        a, b = fast(s), brute(s)
        assert a == b, (s, a, b)


def _q2_list_input(n, vals, extra_before=''):
    head = f"{n}" + (f" {extra_before}" if extra_before != '' else '')
    return head + "\n" + (' '.join(map(str, vals[:n])) if vals[:n] else '') + "\n"


def _q2_parse(s):
    L = s.strip().split('\n')
    hdr = list(map(int, L[0].split()))
    vals = list(map(int, L[1].split())) if len(L) > 1 and L[1].strip() else []
    return hdr, vals


def _q2_out(vals):
    return ' '.join(map(str, vals)) if vals else 'EMPTY'


class _Node:
    __slots__ = ('v', 'next')

    def __init__(self, v, nxt=None):
        self.v = v
        self.next = nxt


def _q2_build(vals):
    head = None
    for v in reversed(vals):
        head = _Node(v, head)
    return head


def _q2_vals(head):
    out = []
    while head:
        out.append(head.v)
        head = head.next
    return out


# ═══════════════════════════ reversal ═══════════════════════════


def _q2_sol_reverse(s):
    hdr, vals = _q2_parse(s)
    return _q2_out(vals[::-1])


def _q2_brute_reverse(s):
    """Pointer surgery on real nodes: prev/cur/nxt."""
    hdr, vals = _q2_parse(s)
    prev, cur = None, _q2_build(vals)
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return _q2_out(_q2_vals(prev))


_q2_check(_q2_sol_reverse, _q2_brute_reverse,
          lambda: _q2_list_input(_q2_r.randint(0, 10), [_q2_r.randint(-99, 99) for _ in range(10)]))

add('ll-c-reverse', 'Reverse the list', _Q2_T, 'reversal', 800,
    ['linked lists', 'reversal'],
    '<p>Reverse the list and print it head first. The atom everything else is built from: three pointers (<code>prev</code>, <code>cur</code>, <code>nxt</code>), save <code>cur.next</code> BEFORE the flip, flip, advance both. Return <code>prev</code> — the original tail — not the old head. O(n) time, O(1) space, and do it iteratively: the recursive version needs one stack frame per node and dies on long lists.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values (blank when n = 0).</p>',
    '<p>One line: the reversed values, or <code>EMPTY</code>.</p>',
    _q2_sol_reverse,
    ["5\n1 2 3 4 5\n", "2\n2 1\n", "0\n\n"],
    ["1\n42\n", "6\n-1 -1 0 0 1 1\n"],
    lambda: _q2_list_input(_q2_r.randint(0, 40), [_q2_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6,
    large=lambda: _q2_list_input(20000, [_q2_r.randint(0, 99) for _ in range(20000)]))


def _q2_sol_reverse_between(s):
    hdr, vals = _q2_parse(s)
    m, n = hdr[1], hdr[2]
    seg = vals[m - 1:n]
    vals[m - 1:n] = seg[::-1]
    return _q2_out(vals)


def _q2_brute_reverse_between(s):
    """Anchor + counted flips + two stitches, on real nodes."""
    hdr, vals = _q2_parse(s)
    m, n = hdr[1], hdr[2]
    dummy = _Node(0, _q2_build(vals))
    anchor = dummy
    for _ in range(m - 1):
        anchor = anchor.next
    range_head = anchor.next
    prev, cur = None, range_head
    for _ in range(n - m + 1):
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    anchor.next = prev
    range_head.next = cur
    return _q2_out(_q2_vals(dummy.next))


_q2_check(_q2_sol_reverse_between, _q2_brute_reverse_between,
          lambda: (lambda n: (lambda m: (lambda nn: _q2_list_input(n, [_q2_r.randint(-99, 99) for _ in range(n)], f"{m} {nn}"))(
              _q2_r.randint(m, n)))(_q2_r.randint(1, n)))(_q2_r.randint(1, 10)))

add('ll-c-reverse-between', 'Reverse positions m to n', _Q2_T, 'reversal', 1200,
    ['linked lists', 'reversal', 'dummy head'],
    '<p>Reverse the nodes from position m to position n (1-based, inclusive) in ONE pass, and print the result. [1,2,3,4,5] with m = 2, n = 4 gives [1,4,3,2,5].</p>'
    '<p>The one-pass structure: a dummy head (m may be 1), walk an anchor to position m−1, bookmark <code>rangeHead = anchor.next</code> BEFORE flipping, run the three-pointer flip exactly n−m+1 times, then two stitches: <code>anchor.next = prev</code> (front) and <code>rangeHead.next = cur</code> (back — the bookmarked node is now the range\'s tail). Walking to find the range twice also passes the time limit; the single-pass version is what interviewers ask for.</p>',
    '<p>The first line contains n, m and k with 1 ≤ m ≤ k ≤ n ≤ 10<sup>4</sup> (the range is [m, k]). The second line contains the n values.</p>',
    '<p>One line: the resulting values.</p>',
    _q2_sol_reverse_between,
    ["5 2 4\n1 2 3 4 5\n", "5 1 5\n1 2 3 4 5\n", "1 1 1\n7\n"],
    ["3 1 2\n3 5 7\n", "3 2 3\n3 5 7\n", "4 2 2\n1 2 3 4\n"],
    lambda: (lambda n: (lambda m: (lambda nn: _q2_list_input(n, [_q2_r.randint(-10**6, 10**6) for _ in range(n)], f"{m} {nn}"))(
        _q2_r.randint(m, n)))(_q2_r.randint(1, n)))(_q2_r.randint(1, 40)), n_rand=6,
    large=lambda: _q2_list_input(20000, [_q2_r.randint(0, 9) for _ in range(20000)], f"5000 15000"))


def _q2_sol_reverse_kgroup(s):
    hdr, vals = _q2_parse(s)
    k = hdr[1]
    out = []
    i = 0
    while i < len(vals):
        if i + k <= len(vals):
            out += vals[i:i + k][::-1]
        else:
            out += vals[i:]          # partial final group stays
        i += k
    return _q2_out(out)


def _q2_brute_reverse_kgroup(s):
    """Probe-then-flip on real nodes, exactly as the page describes."""
    hdr, vals = _q2_parse(s)
    k = hdr[1]
    dummy = _Node(0, _q2_build(vals))
    group_prev = dummy
    while True:
        # probe: is there a full group of k after group_prev?
        probe = group_prev
        for _ in range(k):
            probe = probe.next
            if probe is None:
                return _q2_out(_q2_vals(dummy.next))
        # flip exactly k nodes starting at group_prev.next
        prev, cur = None, group_prev.next
        for _ in range(k):
            nxt = cur.next
            cur.next = prev
            prev = cur
            cur = nxt
        tail = group_prev.next       # original head of the group = its new tail
        group_prev.next = prev       # front stitch
        tail.next = cur              # back stitch
        group_prev = tail


_q2_check(_q2_sol_reverse_kgroup, _q2_brute_reverse_kgroup,
          lambda: (lambda n, k: _q2_list_input(n, [_q2_r.randint(-99, 99) for _ in range(n)], k))(
              _q2_r.randint(1, 12), _q2_r.randint(1, 5)))

add('ll-c-reverse-kgroup', 'Reverse in k-groups', _Q2_T, 'reversal', 1700,
    ['linked lists', 'reversal', 'hard'],
    '<p>Reverse the list in groups of k nodes; a final partial group (fewer than k nodes) stays as it is. [1,2,3,4,5] with k = 2 gives [2,1,4,3,5]; with k = 3 it gives [3,2,1,4,5].</p>'
    '<p>The disciplined version: keep a <code>groupPrev</code> anchor (start: a dummy); PROBE k nodes ahead — if the probe falls off the end, stop, which guarantees the flip never runs past the tail; then run exactly k three-pointer flips, front-stitch <code>groupPrev.next = prev</code>, back-stitch from the group\'s ORIGINAL head (now its tail) to <code>cur</code>, and move the anchor to that tail. Every node is probed once and flipped once: O(n) time, O(1) space. Skipping the probe is the classic "works except when n % k ≠ 0" bug.</p>',
    '<p>The first line contains n and k (1 ≤ k ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: the resulting values.</p>',
    _q2_sol_reverse_kgroup,
    ["5 2\n1 2 3 4 5\n", "5 3\n1 2 3 4 5\n", "4 4\n1 2 3 4\n"],
    ["1 1\n9\n", "6 6\n1 2 3 4 5 6\n", "7 7\n1 2 3 4 5 6 7\n"],
    lambda: (lambda n, k: _q2_list_input(n, [_q2_r.randint(-10**6, 10**6) for _ in range(n)], k))(
        _q2_r.randint(1, 40), _q2_r.randint(1, 8)), n_rand=6,
    large=lambda: _q2_list_input(20000, [_q2_r.randint(0, 9) for _ in range(20000)], 3))


# ═══════════════════════════ fast/slow ═══════════════════════════


def _q2_sol_middle(s):
    hdr, vals = _q2_parse(s)
    if not vals:
        return 'EMPTY'
    return str(vals[len(vals) // 2])     # second middle on even n — guard fast && fast.next


_q2_check(_q2_sol_middle, _q2_sol_middle,
          lambda: _q2_list_input(_q2_r.randint(1, 10), [_q2_r.randint(-99, 99) for _ in range(10)]))

add('ll-c-middle', 'The middle, one pass', _Q2_T, 'fast-slow-pointers', 800,
    ['linked lists', 'fast/slow'],
    '<p>Print the value of the middle node in ONE pass. On even length, return the SECOND of the two middles ([1,2,3,4] → 3) — the choice the <code>while (fast && fast.next)</code> guard makes with both pointers starting at head.</p>'
    '<p>The invariant that makes it correct: fast\'s index is always twice slow\'s, so when fast can no longer double-step, slow sits at ⌊n/2⌋. Two passes (count, then walk n/2) is the same big-O but needs the length first — impossible on a stream. Say which middle your guard produces BEFORE you code: that single sentence is the credibility move.</p>',
    '<p>The first line contains n (1 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One integer: the middle value.</p>',
    _q2_sol_middle,
    ["5\n1 2 3 4 5\n", "6\n1 2 3 4 5 6\n", "1\n42\n"],
    ["2\n7 8\n", "4\n-1 0 0 1\n"],
    lambda: _q2_list_input(_q2_r.randint(1, 40), [_q2_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6)


def _q2_sol_nth_from_end(s):
    hdr, vals = _q2_parse(s)
    n = hdr[1]
    return str(vals[len(vals) - n])


_q2_check(_q2_sol_nth_from_end, _q2_sol_nth_from_end,
          lambda: (lambda L: _q2_list_input(L, [_q2_r.randint(-99, 99) for _ in range(L)], _q2_r.randint(1, L)))(
              _q2_r.randint(1, 12)))

add('ll-c-nth-from-end', 'nth from the end, one pass', _Q2_T, 'fast-slow-pointers', 900,
    ['linked lists', 'fast/slow', 'fixed gap'],
    '<p>Print the value of the nth node from the end (n = 1 is the tail) in ONE pass, without ever counting the length.</p>'
    '<p>The fixed-gap trick: send <code>first</code> n steps ahead, then slide both pointers until <code>first</code> falls off the end — the gap is forever n, so <code>second</code> lands at length−n. This is not just prettier than two passes: when the sequence is a stream you cannot re-read, one pass is the ONLY option. (For DELETION the gap becomes n+1 — you need the victim\'s predecessor — and a dummy head absorbs "the victim is the head".)</p>',
    '<p>The first line contains length and n (1 ≤ n ≤ length ≤ 10<sup>4</sup>). The second line contains the values.</p>',
    '<p>One integer: the value of the nth node from the end.</p>',
    _q2_sol_nth_from_end,
    ["5 2\n1 2 3 4 5\n", "1 1\n7\n", "6 6\n4 5 6 7 8 9\n"],
    ["3 3\n1 2 3\n", "3 1\n1 2 3\n"],
    lambda: (lambda L: _q2_list_input(L, [_q2_r.randint(-10**6, 10**6) for _ in range(L)], _q2_r.randint(1, L)))(
        _q2_r.randint(1, 40)), n_rand=6)


def _q2_sol_remove_nth(s):
    hdr, vals = _q2_parse(s)
    n = hdr[1]
    del vals[len(vals) - n]
    return _q2_out(vals)


def _q2_brute_remove_nth(s):
    """Dummy + gap n+1, one pass, on real nodes."""
    hdr, vals = _q2_parse(s)
    n = hdr[1]
    dummy = _Node(0, _q2_build(vals))
    first = dummy
    for _ in range(n + 1):
        first = first.next
    second = dummy
    while first:
        first = first.next
        second = second.next
    second.next = second.next.next
    return _q2_out(_q2_vals(dummy.next))


_q2_check(_q2_sol_remove_nth, _q2_brute_remove_nth,
          lambda: (lambda L: _q2_list_input(L, [_q2_r.randint(-99, 99) for _ in range(L)], _q2_r.randint(1, L)))(
              _q2_r.randint(1, 12)))

add('ll-c-remove-nth', 'Delete nth from the end, one pass', _Q2_T, 'fast-slow-pointers', 1200,
    ['linked lists', 'fast/slow', 'fixed gap', 'dummy head'],
    '<p>Delete the nth node from the end and print the survivors — in ONE pass. The two twists over plain lookup: the gap must be <b>n+1</b> (deletion needs the victim\'s PREDECESSOR, so when first falls off the end, second sits one node before the victim), and a <b>dummy head</b> is mandatory (the victim may be the head, n = length, and then its "predecessor" is the dummy itself). The unlink is the standard skip-over: <code>second.next = second.next.next</code>. Return <code>dummy.next</code>.</p>',
    '<p>The first line contains length and n (1 ≤ n ≤ length ≤ 10<sup>4</sup>). The second line contains the values.</p>',
    '<p>One line: the length−1 survivors head first, or <code>EMPTY</code> if the list becomes empty.</p>',
    _q2_sol_remove_nth,
    ["5 2\n1 2 3 4 5\n", "1 1\n7\n", "5 5\n1 2 3 4 5\n"],
    ["2 1\n1 2\n", "2 2\n1 2\n", "3 3\n9 9 9\n"],
    lambda: (lambda L: _q2_list_input(L, [_q2_r.randint(-10**6, 10**6) for _ in range(L)], _q2_r.randint(1, L)))(
        _q2_r.randint(1, 40)), n_rand=6)


# ═══════════════════════════ cycles ═══════════════════════════


def _q2_parse_cycle(s):
    """Header: n pos (pos = -1 means no cycle). Values line, then nothing.
    pos is the 0-based index of the node the tail links back to."""
    L = s.strip().split('\n')
    n, pos = map(int, L[0].split())
    vals = list(map(int, L[1].split())) if n else []
    return n, pos, vals


def _q2_build_cycle(n, pos, vals):
    """Returns (head, entrance_or_None)."""
    head = _q2_build(vals)
    if pos < 0 or n == 0:
        return head, None
    nodes = []
    cur = head
    while cur:
        nodes.append(cur)
        cur = cur.next
    nodes[-1].next = nodes[pos]
    return head, nodes[pos]


def _q2_sol_cycle(s):
    n, pos, vals = _q2_parse_cycle(s)
    head, entrance = _q2_build_cycle(n, pos, vals)
    # Floyd: detect, then locate the entrance by pointer identity.
    slow = fast = head
    meet = None
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            meet = slow
            break
    if meet is None:
        return '-1'
    p = head
    while p is not meet:
        p = p.next
        meet = meet.next
    # find the entrance's index
    idx = 0
    cur = head
    while cur is not p:
        cur = cur.next
        idx += 1
    return str(idx)


def _q2_brute_cycle(s):
    """Seen-set of node identities; the entrance is the FIRST index of the revisited node."""
    n, pos, vals = _q2_parse_cycle(s)
    head, entrance = _q2_build_cycle(n, pos, vals)
    seen = {}
    idx = 0
    cur = head
    while cur:
        if id(cur) in seen:
            return str(seen[id(cur)])
        seen[id(cur)] = idx
        cur = cur.next
        idx += 1
    return '-1'


def _q2_gen_cycle(n):
    pos = -1 if _q2_r.random() < 0.4 else _q2_r.randint(0, n - 1)
    return f"{n} {pos}\n" + ' '.join(str(_q2_r.randint(-99, 99)) for _ in range(n)) + ('\n' if n else '\n')


_q2_check(_q2_sol_cycle, _q2_brute_cycle, lambda: _q2_gen_cycle(_q2_r.randint(1, 12)))

add('ll-c-cycle-entrance', 'Where does the cycle start?', _Q2_T, 'cycle-detection', 1200,
    ['linked lists', 'fast/slow', 'Floyd'],
    '<p>The tail of the list may link back to an earlier node, forming a cycle. Print the 0-based index of the cycle\'s entrance node, or −1 if there is no cycle. Compare NODES, never values: two equal values are not the same node.</p>'
    '<p>Floyd, both phases: (1) tortoise 1 step, hare 2 — inside a cycle the gap shrinks by exactly 1 per round so they MUST meet (or the hare falls off the end: no cycle); (2) restart one pointer at head, walk both one step per round — they meet exactly at the entrance, because L = jC − m: walking L steps from the meeting point backs up m steps to the entrance plus j whole laps. O(n) time, O(1) space. The hash-set method is correct too but pays O(n) memory — say both costs.</p>',
    '<p>The first line contains n and pos (1 ≤ n ≤ 10<sup>4</sup>; pos is the 0-based index the tail links to, or −1 for no cycle). The second line contains the n values.</p>',
    '<p>One integer: the entrance index, or −1.</p>',
    _q2_sol_cycle,
    ["4 1\n3 2 0 -4\n", "2 0\n1 2\n", "1 -1\n1\n"],
    ["3 -1\n1 2 3\n", "5 4\n1 2 3 4 5\n", "5 0\n1 1 1 1 1\n", "2 -1\n7 7\n"],
    lambda: _q2_gen_cycle(_q2_r.randint(1, 40)), n_rand=7,
    large=lambda: f"20000 10000\n" + ' '.join(str(_q2_r.randint(0, 9)) for _ in range(20000)) + '\n')


def _q2_sol_cycle_length(s):
    n, pos, vals = _q2_parse_cycle(s)
    head, entrance = _q2_build_cycle(n, pos, vals)
    if entrance is None:
        return '0'
    # freeze one pointer at the meeting node, walk the other around
    slow = fast = head
    while True:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            break
    C = 1
    p = slow.next
    while p is not slow:
        p = p.next
        C += 1
    return str(C)


_q2_check(_q2_sol_cycle_length, lambda s: str(0 if _q2_parse_cycle(s)[1] < 0 else _q2_parse_cycle(s)[0] - _q2_parse_cycle(s)[1]),
          lambda: _q2_gen_cycle(_q2_r.randint(1, 12)))

add('ll-c-cycle-length', 'How long is the cycle?', _Q2_T, 'cycle-detection', 1200,
    ['linked lists', 'fast/slow', 'Floyd'],
    '<p>Print the number of nodes in the cycle, or 0 if the list is acyclic.</p>'
    '<p>Floyd first (detect the meeting node), then the act-three trick: FREEZE one pointer at the meeting node and walk the other around until it returns — the step count is exactly the cycle length C, because inside a cycle "returning to a fixed node" means one full lap. O(n) time, O(1) space, no visited set. This is the standard follow-up after "does it cycle?" and "where does it start?" — all three acts share one detection pass.</p>',
    '<p>The first line contains n and pos (1 ≤ n ≤ 10<sup>4</sup>; pos is the 0-based index the tail links to, or −1). The second line contains the n values.</p>',
    '<p>One integer: the cycle length, or 0.</p>',
    _q2_sol_cycle_length,
    ["4 1\n3 2 0 -4\n", "2 0\n1 2\n", "1 -1\n1\n"],
    ["5 0\n1 2 3 4 5\n", "5 4\n1 2 3 4 5\n", "3 -1\n1 2 3\n"],
    lambda: _q2_gen_cycle(_q2_r.randint(1, 40)), n_rand=7)


def _q2_sol_happy(s):
    L = s.strip().split('\n')
    t = int(L[0])
    out = []
    for line in L[1:1 + t]:
        x = int(line)
        seen = set()
        while x != 1 and x not in seen:
            seen.add(x)
            x = sum(d * d for d in map(int, str(x)))
        out.append('1' if x == 1 else '0')
    return '\n'.join(out)


def _q2_brute_happy(s):
    """Floyd on the digit-square chain — no set."""
    L = s.strip().split('\n')
    t = int(L[0])
    out = []

    def f(x):
        return sum(d * d for d in map(int, str(x)))

    for line in L[1:1 + t]:
        x = int(line)
        slow = fast = x
        while True:
            slow = f(slow)
            fast = f(f(fast))
            if slow == fast:
                break
        out.append('1' if slow == 1 else '0')
    return '\n'.join(out)


_q2_check(_q2_sol_happy, _q2_brute_happy,
          lambda: "5\n" + '\n'.join(str(_q2_r.randint(1, 10**6)) for _ in range(5)) + '\n')

add('ll-c-happy-number', 'The cycle you cannot see', _Q2_T, 'cycle-detection', 1000,
    ['fast/slow', 'Floyd', 'math'],
    '<p>A number is HAPPY if repeatedly replacing it by the sum of the squares of its digits eventually reaches 1. Otherwise the chain enters a cycle that never contains 1. For each query print 1 (happy) or 0 (not).</p>'
    '<p>There is no list in the input — the list is the digit-square CHAIN, and the question is cycle detection wearing a disguise: does the orbit of x reach the fixed point 1, or fall into a cycle? Floyd on the function f(x) = digit-square sum needs no memory at all; the seen-set method is correct but O(cycle) space. "Where is the linked list?" is exactly the recognition step the page\'s guide trains: "does it terminate?" means Floyd. (Why it always cycles: every number above a few digits maps to something smaller, so orbits are bounded — the pigeonhole principle finishes it.)</p>',
    '<p>The first line contains T (1 ≤ T ≤ 1000). Each of the next T lines contains x (1 ≤ x ≤ 10<sup>9</sup>).</p>',
    '<p>T lines: 1 or 0.</p>',
    _q2_sol_happy,
    ["3\n19\n2\n7\n"],
    ["4\n1\n4\n10\n999999999\n"],
    lambda: f"{_q2_r.randint(1, 20)}\n" + '\n'.join(str(_q2_r.randint(1, 10**9)) for _ in range(20)) + '\n', n_rand=5)


# ═══════════════════════════ palindrome & halves ═══════════════════════════


def _q2_sol_palindrome(s):
    hdr, vals = _q2_parse(s)
    return '1' if vals == vals[::-1] else '0'


_q2_check(_q2_sol_palindrome, _q2_sol_palindrome,
          lambda: _q2_list_input(_q2_r.randint(0, 12), [_q2_r.randint(1, 5) for _ in range(12)]))

add('ll-c-palindrome', 'Is it a palindrome? (restore after)', _Q2_T, 'palindrome-halves', 1100,
    ['linked lists', 'fast/slow', 'reversal'],
    '<p>Print 1 if the value sequence reads the same forwards and backwards, else 0.</p>'
    '<p>The O(1)-space composition: next-next guard finds the node BEFORE the second half, reverse the second half in place, walk p from head and q from the reversed half comparing until q exhausts (q is the shorter-or-equal half; on odd n the middle is never compared — it mirrors itself). Then RESTORE: reverse the half back and relink it after slow — on BOTH exits, including the mismatch early-return. A query that mutates its input is a design bug, and judges that re-traverse after the call fail you on the spot.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: 1 or 0.</p>',
    _q2_sol_palindrome,
    ["5\n1 2 3 2 1\n", "4\n1 2 2 1\n", "3\n1 2 3\n"],
    ["0\n\n", "1\n5\n", "2\n1 2\n", "6\n1 2 9 8 2 1\n"],
    lambda: _q2_list_input(_q2_r.randint(0, 40), [_q2_r.randint(0, 3) for _ in range(40)]), n_rand=7)


def _q2_sol_split_halves(s):
    hdr, vals = _q2_parse(s)
    h = (len(vals) + 1) // 2
    return _q2_out(vals[:h]) + '\n' + _q2_out(vals[h:])


_q2_check(_q2_sol_split_halves, _q2_sol_split_halves,
          lambda: _q2_list_input(_q2_r.randint(1, 12), [_q2_r.randint(-99, 99) for _ in range(12)]))

add('ll-c-split-halves', 'Cut the list in half', _Q2_T, 'palindrome-halves', 800,
    ['linked lists', 'fast/slow'],
    '<p>Split the list into a first half of ⌈n/2⌉ nodes and a second half of ⌊n/2⌋ nodes (odd n: the middle rides in the FIRST half), and print the two halves on two lines. On a real list this is one fast/slow walk with the next-next guard plus the CUT write <code>slow.next = null</code> — the same split that powers palindrome and merge sort.</p>'
    '<p>Why the guard matters: with a wrong guard a 2-node list splits 2+0 and every recursion built on this split never terminates. Trace n = 2 by hand, always.</p>',
    '<p>The first line contains n (1 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>Two lines: the first half head first, then the second half head first.</p>',
    _q2_sol_split_halves,
    ["5\n1 2 3 4 5\n", "6\n1 2 3 4 5 6\n", "1\n9\n"],
    ["2\n1 2\n", "3\n1 2 3\n"],
    lambda: _q2_list_input(_q2_r.randint(1, 40), [_q2_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6)
