# Linked lists judged problems, part 4 (exec'd by ../linked_lists.py)
# Pages: extra-pointers, cheatsheet.
import random as _q4_r
import re as _q4_re
import sys as _q4_sys

_Q4_T = 'linked-lists'


def _q4_check(fast, brute, gen, rounds=300):
    for _ in range(rounds):
        s = gen()
        a, b = fast(s), brute(s)
        assert a == b, (s, a, b)


def _q4_list_input(n, vals, extra_before=''):
    head = f"{n}" + (f" {extra_before}" if extra_before != '' else '')
    return head + "\n" + (' '.join(map(str, vals[:n])) if vals[:n] else '') + "\n"


def _q4_parse(s):
    L = s.strip().split('\n')
    hdr = list(map(int, L[0].split()))
    vals = list(map(int, L[1].split())) if len(L) > 1 and L[1].strip() else []
    return hdr, vals


def _q4_out(vals):
    return ' '.join(map(str, vals)) if vals else 'EMPTY'


class _Node:
    __slots__ = ('v', 'next')

    def __init__(self, v, nxt=None):
        self.v = v
        self.next = nxt


def _q4_build(vals):
    head = None
    for v in reversed(vals):
        head = _Node(v, head)
    return head


def _q4_vals(head):
    out = []
    while head:
        out.append(head.v)
        head = head.next
    return out


# ═══════════════════════════ extra pointers ═══════════════════════════


def _q4_parse_two(s):
    L = s.strip().split('\n')
    na, nb = map(int, L[0].split())
    a = list(map(int, L[1].split())) if na else []
    b = list(map(int, L[2].split())) if nb else []
    return a, b


def _q4_sol_add_numbers(s):
    a, b = _q4_parse_two(s)
    # reversed-digit lists: school arithmetic streams from the heads
    dummy = _Node(0)
    tail = dummy
    carry = 0
    i = j = 0
    while i < len(a) or j < len(b) or carry:
        tot = carry + (a[i] if i < len(a) else 0) + (b[j] if j < len(b) else 0)
        carry = tot // 10
        tail.next = _Node(tot % 10)
        tail = tail.next
        i += 1
        j += 1
    return _q4_out(_q4_vals(dummy.next))


def _q4_brute_add_numbers(s):
    a, b = _q4_parse_two(s)
    na = int(''.join(map(str, reversed(a)))) if a else 0
    nb = int(''.join(map(str, reversed(b)))) if b else 0
    tot = na + nb
    digits = list(map(int, reversed(str(tot))))
    return _q4_out(digits)


def _q4_gen_digits(n):
    if n == 0:
        return []
    # last digit on the line is the MOST significant: nonzero unless single 0
    return [_q4_r.randint(0, 9) for _ in range(n - 1)] + [_q4_r.randint(1, 9) if n > 1 else _q4_r.randint(0, 9)]


def _q4_gen_digits_fwd(n):
    if n == 0:
        return []
    # first digit on the line is the MOST significant: nonzero unless single 0
    return [_q4_r.randint(1, 9) if n > 1 else _q4_r.randint(0, 9)] + \
        [_q4_r.randint(0, 9) for _ in range(n - 1)]


def _q4_gen_two_lens(lo=0, hi=8, digits=_q4_gen_digits):
    na, nb = _q4_r.randint(lo, hi), _q4_r.randint(lo, hi)
    while na == 0 and nb == 0:
        na, nb = _q4_r.randint(lo, hi), _q4_r.randint(lo, hi)
    return f"{na} {nb}\n" + ' '.join(map(str, digits(na))) + '\n' + \
        ' '.join(map(str, digits(nb))) + '\n'


_q4_check(_q4_sol_add_numbers, _q4_brute_add_numbers, lambda: _q4_gen_two_lens(0, 8))

add('ll-c-add-numbers', 'Add two reversed-digit numbers', _Q4_T, 'extra-pointers', 1000,
    ['linked lists', 'carry', 'design'],
    '<p>Two non-negative integers are stored as lists of digits, ONES digit at the head (342 is 2→4→3). Add them and print the sum as a reversed-digit list (so 342 + 465 = 807 prints as <code>7 0 8</code>).</p>'
    '<p>The reversal is a gift: school arithmetic proceeds from the ones digit, which is the HEAD — so the addition streams forward through both lists with a carry, no reversal needed. The loop condition <code>a || b || carry</code> absorbs ragged lengths AND the final carry (999 + 1 grows a digit) with zero special cases. Never convert to an integer: with up to 100 digits every machine type overflows — the number must never be formed.</p>',
    '<p>The first line contains na and nb (0 ≤ na, nb ≤ 100; at least one is positive). Line 2: A\'s na digits head first (ones digit first; no leading zeros in the number, so the LAST digit on the line is nonzero unless the number is a single 0). Line 3: B\'s nb digits likewise.</p>',
    '<p>One line: the sum\'s digits, ones digit first.</p>',
    _q4_sol_add_numbers,
    ["3 3\n2 4 3\n5 6 4\n", "3 1\n9 9 9\n1\n", "1 1\n0\n0\n"],
    ["1 2\n5\n5 5\n", "2 3\n9 9\n1 0 1\n"],
    lambda: _q4_gen_two_lens(0, 20), n_rand=6,
    large=lambda: f"100 100\n" + ' '.join(['9'] * 100) + '\n' + ' '.join(['9'] * 100) + '\n')


def _q4_sol_add_forward(s):
    a, b = _q4_parse_two(s)
    # reverse both, add reversed, reverse the result — O(1) space on real nodes
    ha, hb = _q4_build(a), _q4_build(b)

    def rev(h):
        prev, cur = None, h
        while cur:
            nxt = cur.next
            cur.next = prev
            prev = cur
            cur = nxt
        return prev

    ha, hb = rev(ha), rev(hb)
    dummy = _Node(0)
    tail = dummy
    carry = 0
    while ha or hb or carry:
        tot = carry + (ha.v if ha else 0) + (hb.v if hb else 0)
        carry = tot // 10
        tail.next = _Node(tot % 10)
        tail = tail.next
        ha = ha.next if ha else None
        hb = hb.next if hb else None
    return _q4_out(_q4_vals(rev(dummy.next)))


def _q4_brute_add_forward(s):
    a, b = _q4_parse_two(s)
    na = int(''.join(map(str, a))) if a else 0
    nb = int(''.join(map(str, b))) if b else 0
    return _q4_out(list(map(int, str(na + nb))))


_q4_check(_q4_sol_add_forward, _q4_brute_add_forward, lambda: _q4_gen_two_lens(1, 8, _q4_gen_digits_fwd))

add('ll-c-add-numbers-forward', 'Add two forward-digit numbers', _Q4_T, 'extra-pointers', 1800,
    ['linked lists', 'carry', 'reversal', 'hard'],
    '<p>Now the digits arrive MOST significant first (342 is 3→4→2). Add the two numbers and print the sum head first. The follow-up the reversed version exists to set up: school arithmetic needs the ONES digits, and they are now at the TAILS — unreachable in one forward walk.</p>'
    '<p>Every valid approach manufactures back-to-front access: (1) reverse both lists, stream the carry, reverse the result — O(n) time, O(1) space, mutates the inputs; (2) recurse to both ends and add on the way back, propagating the carry up — O(n) stack; (3) copy the digits to arrays and add from the ends — O(n) space, inputs untouched. Name all three with costs and you have answered completely. Converting to an integer is disqualified: up to 100 digits overflow every machine type.</p>',
    '<p>The first line contains na and nb (1 ≤ na, nb ≤ 100). Line 2: A\'s digits head first (most significant first; no leading zeros). Line 3: B\'s digits likewise.</p>',
    '<p>One line: the sum\'s digits, most significant first (no leading zeros).</p>',
    _q4_sol_add_forward,
    ["3 3\n3 4 2\n4 6 5\n", "1 3\n5\n9 9 9\n", "3 1\n9 9 9\n1\n"],
    ["1 1\n1\n1\n", "2 2\n9 9\n9 9\n"],
    lambda: _q4_gen_two_lens(1, 20, _q4_gen_digits_fwd), n_rand=6,
    large=lambda: f"100 100\n" + ' '.join(['9'] * 100) + '\n' + ' '.join(['9'] * 100) + '\n')


def _q4_parse_flatten(s):
    """Line 1: n. Next n lines: 'v nextIdx childIdx' (-1 = null). Head = node 0."""
    L = s.strip().split('\n')
    n = int(L[0])
    v, nxt, ch = [], [], []
    for line in L[1:1 + n]:
        a, b, c = map(int, line.split())
        v.append(a)
        nxt.append(b)
        ch.append(c)
    return n, v, nxt, ch


def _q4_sol_flatten(s):
    """The page's iterative algorithm: explicit stack of return points."""
    n, v, nxt, ch = _q4_parse_flatten(s)
    nxt = list(nxt)
    ch = list(ch)
    cur = 0
    stack = []
    while cur != -1:
        if ch[cur] != -1:
            if nxt[cur] != -1:
                stack.append(nxt[cur])
            nxt[cur] = ch[cur]
            ch[cur] = -1
        if nxt[cur] == -1 and stack:
            nxt[cur] = stack.pop()
        cur = nxt[cur]
    out = []
    cur = 0
    while cur != -1:
        out.append(v[cur])
        cur = nxt[cur]
    return _q4_out(out)


def _q4_brute_flatten(s):
    """Recursive preorder: node, then its flattened child list, then next."""
    n, v, nxt, ch = _q4_parse_flatten(s)
    syslimit = _q4_sys.getrecursionlimit()
    _q4_sys.setrecursionlimit(max(syslimit, n + 100))
    out = []

    def walk(i):
        while i != -1:
            out.append(v[i])
            if ch[i] != -1:
                walk(ch[i])
            i = nxt[i]

    walk(0)
    _q4_sys.setrecursionlimit(syslimit)
    return _q4_out(out)


def _q4_gen_flatten(nn=None):
    """Build a random multilevel structure; nodes are numbered in creation order."""
    nn = nn if nn is not None else _q4_r.randint(1, 12)
    v = [_q4_r.randint(0, 99) for _ in range(nn)]
    nxt = [-1] * nn
    ch = [-1] * nn
    # assign each node (except 0) as either a next-of or child-of an earlier node
    placed = [0]
    for i in range(1, nn):
        parent = _q4_r.choice(placed)
        if ch[parent] == -1 and _q4_r.random() < 0.4:
            ch[parent] = i
        else:
            # append to the end of parent's own chain
            tail = parent
            while nxt[tail] != -1:
                tail = nxt[tail]
            nxt[tail] = i
        placed.append(i)
    lines = [str(nn)]
    for i in range(nn):
        lines.append(f"{v[i]} {nxt[i]} {ch[i]}")
    return '\n'.join(lines) + '\n'


_q4_check(_q4_sol_flatten, _q4_brute_flatten, _q4_gen_flatten)

add('ll-c-flatten', 'Flatten a multilevel list', _Q4_T, 'extra-pointers', 1500,
    ['linked lists', 'doubly', 'stack', 'DFS'],
    '<p>Each node has a value, a <code>next</code> pointer and a <code>child</code> pointer to another list. Flatten everything into ONE list: each child list is spliced between its parent and the parent\'s next, depth-first — children before the parent\'s own successor. Print the flattened order.</p>'
    '<p>The input hands you the nodes by index: node 0 is the head, and each node\'s next/child are indexes (−1 = null). The intended algorithm is the page\'s iterative walk: when you dive into <code>cur.child</code>, push <code>cur.next</code> (the RETURN POINT) onto an explicit stack; when a level runs out (next = −1), pop and relink. The stack holds exactly what recursion would hold on its frames — it IS the recursion, made explicit, and it is the template for every iterative DFS you will write on trees and graphs. Space O(depth), not O(n).</p>',
    '<p>The first line contains n (1 ≤ n ≤ 1000). Each of the next n lines describes node i: <code>v nextIdx childIdx</code> — its value, the index of its next node (−1 if none), and the index of its child list\'s head (−1 if none). The structure is a valid multilevel list: no cycles, no shared nodes, every node reachable from node 0.</p>',
    '<p>One line: the n values in flattened order.</p>',
    _q4_sol_flatten,
    ["6\n1 1 -1\n2 2 4\n3 -1 -1\n7 -1 5\n4 -1 -1\n5 -1 -1\n" if False else
     "6\n1 1 -1\n2 2 3\n3 -1 -1\n4 -1 -1\n5 4 -1\n6 -1 -1\n", "1\n9 -1 -1\n"],
    ["3\n1 -1 1\n2 2 -1\n3 -1 -1\n", "4\n1 1 2\n2 -1 -1\n3 -1 -1\n4 -1 -1\n"],
    _q4_gen_flatten, n_rand=7,
    large=lambda: _q4_gen_flatten(1000))


def _q4_sol_nested(s):
    """Explicit stack: push a list's items in reverse, ints go straight out."""
    txt = s.strip()
    out = []
    stack = []

    def tokenize_push_items(t):
        # parse a bracketed body into items and push them reversed
        items = []
        depth = 0
        start = None
        i = 0
        while i < len(t):
            c = t[i]
            if c == '[':
                if depth == 0:
                    start = i
                depth += 1
            elif c == ']':
                depth -= 1
                if depth == 0:
                    items.append(t[start:i + 1])
            elif c == ',' and depth == 0:
                pass
            elif depth == 0 and (c.isdigit() or c == '-'):
                j = i
                while j < len(t) and (t[j].isdigit() or t[j] == '-'):
                    j += 1
                items.append(t[i:j])
                i = j - 1
            i += 1
        for it in reversed(items):
            stack.append(it)

    tokenize_push_items(txt)
    while stack:
        it = stack.pop()
        if it.startswith('['):
            tokenize_push_items(it[1:-1])
        else:
            out.append(int(it))
    return _q4_out(out)


def _q4_brute_nested(s):
    ints = _q4_re.findall(r'-?\d+', s)
    return ' '.join(ints) if ints else 'EMPTY'


def _q4_gen_nested(depth=0, breadth=3):
    parts = []
    k = _q4_r.randint(0, breadth)
    for _ in range(k):
        if depth < 3 and _q4_r.random() < 0.4:
            parts.append(_q4_gen_nested(depth + 1, breadth))
        else:
            parts.append(str(_q4_r.randint(-50, 50)))
    return '[' + ','.join(parts) + ']'


_q4_check(_q4_sol_nested, _q4_brute_nested, _q4_gen_nested)

add('ll-c-nested-flatten', 'Flatten a nested integer structure', _Q4_T, 'extra-pointers', 1400,
    ['stack', 'DFS', 'parsing'],
    '<p>The input is a nested structure of integers: <code>[1,[4,[6]],2]</code> flattens to 1 4 6 2. Each element is either an integer or another nested list, to any depth. Print all integers in flatten order (left to right, depth first).</p>'
    '<p>Same muscle as the multilevel flatten: a child list interrupts the current level, and you must RESUME where you left off. The intended method is an explicit stack — pop an item; if it is an integer, output it; if it is a list, push its items back in REVERSE order so they pop left-to-right. (Recursive descent is the same walk on the call stack; the explicit stack is what generalises to iterators and to the tree/graph DFS ahead.) This is the list-with-a-child-pointer problem wearing a parser\'s clothes.</p>',
    '<p>One line: a nested structure of at most 10<sup>4</sup> integers, nesting depth ≤ 10, integers in [−1000, 1000]. It may be the empty list <code>[]</code>.</p>',
    '<p>One line: the integers in flatten order, or <code>EMPTY</code>.</p>',
    _q4_sol_nested,
    ["[1,[4,[6]],2]\n", "[]\n", "[[1],2,[3,[4,5]]]\n"],
    ["[0]\n", "[[],[],[[]]]\n", "[-1,[-2,[-3]]]\n"],
    _q4_gen_nested, n_rand=6,
    large=lambda: '[' + ','.join(str(_q4_r.randint(0, 999)) for _ in range(10000)) + ']\n')


# ═══════════════════════════ cheatsheet ═══════════════════════════


def _q4_sol_delete_middle(s):
    hdr, vals = _q4_parse(s)
    del vals[len(vals) // 2]      # second middle on even n — LC 2038's definition
    return _q4_out(vals)


def _q4_brute_delete_middle(s):
    """One pass: fast/slow with slowPrev, dummy for the head-victim case."""
    hdr, vals = _q4_parse(s)
    dummy = _Node(0, _q4_build(vals))
    slow_prev = dummy
    slow = dummy.next
    fast = dummy.next
    while fast and fast.next:
        slow_prev = slow
        slow = slow.next
        fast = fast.next.next
    slow_prev.next = slow.next
    return _q4_out(_q4_vals(dummy.next))


_q4_check(_q4_sol_delete_middle, _q4_brute_delete_middle,
          lambda: _q4_list_input(_q4_r.randint(1, 12), [_q4_r.randint(-99, 99) for _ in range(12)]))

add('ll-c-delete-middle', 'Delete the middle node, one pass', _Q4_T, 'cheatsheet', 900,
    ['linked lists', 'fast/slow', 'dummy head'],
    '<p>Delete the MIDDLE node in a single pass and print the survivors. On even length the middle is the SECOND of the two middles ([1,2,3,4] deletes 3); a one-node list becomes empty.</p>'
    '<p>Two templates combine: fast/slow (slow at ⌊n/2⌋ when the loop ends) and the deletion discipline — you need the victim\'s PREDECESSOR, so carry a <code>slowPrev</code> one step behind slow (or start the walkers at a dummy). The dummy also absorbs "the middle is the head"... on a 1-node list the victim IS that node and the answer is <code>dummy.next</code> = null. One pass, O(1) space.</p>',
    '<p>The first line contains n (1 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: the n−1 survivors, or <code>EMPTY</code>.</p>',
    _q4_sol_delete_middle,
    ["5\n1 2 3 4 5\n", "6\n1 2 3 4 5 6\n", "1\n7\n"],
    ["2\n1 2\n", "3\n9 8 7\n"],
    lambda: _q4_list_input(_q4_r.randint(1, 40), [_q4_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6)


def _q4_sol_sort012(s):
    hdr, vals = _q4_parse(s)
    return _q4_out(sorted(vals))


def _q4_brute_sort012(s):
    """Three dummy chains threaded in one walk + two concatenations."""
    hdr, vals = _q4_parse(s)
    d0, d1, d2 = _Node(0), _Node(0), _Node(0)
    t0, t1, t2 = d0, d1, d2
    head = _q4_build(vals)
    while head:
        if head.v == 0:
            t0.next = head
            t0 = head
        elif head.v == 1:
            t1.next = head
            t1 = head
        else:
            t2.next = head
            t2 = head
        head = head.next
    t2.next = None                       # SEAL the last grown chain
    t0.next = d1.next if d1.next else d2.next
    t1.next = d2.next
    start = d0.next if d0.next else (d1.next if d1.next else d2.next)
    return _q4_out(_q4_vals(start))


_q4_check(_q4_sol_sort012, _q4_brute_sort012,
          lambda: _q4_list_input(_q4_r.randint(0, 12), [_q4_r.randint(0, 2) for _ in range(12)]))

add('ll-c-sort-012', 'Sort a list of 0s, 1s and 2s by relinking', _Q4_T, 'cheatsheet', 1100,
    ['linked lists', 'threading', 'partition'],
    '<p>The list holds only 0s, 1s and 2s. Sort it BY RELINKING — no counting sort, no rewriting values — in one pass, O(1) space, and print the result.</p>'
    '<p>The threading template at its purest: grow three dummy-headed chains (zeros, ones, twos) as you walk the input — each node routed to its chain\'s tail — then SEAL the last chain (<code>t2.next = null</code>; an unsealed tail re-drags input nodes) and concatenate with two writes. Arrival order inside each chain is preserved automatically (stable), which value-counting would not be if nodes carried satellite data. This is the three-way partition of the regrouping page applied as a sort.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values, each 0, 1 or 2.</p>',
    '<p>One line: the sorted values, or <code>EMPTY</code>.</p>',
    _q4_sol_sort012,
    ["8\n0 1 2 0 1 2 0 1\n", "5\n2 2 1 0 0\n", "0\n\n"],
    ["1\n1\n", "3\n2 1 0\n"],
    lambda: _q4_list_input(_q4_r.randint(0, 40), [_q4_r.randint(0, 2) for _ in range(40)]), n_rand=6)


def _q4_sol_split_alternate(s):
    hdr, vals = _q4_parse(s)
    return _q4_out(vals[0::2]) + '\n' + _q4_out(vals[1::2])


def _q4_brute_split_alternate(s):
    """Two chains threaded off one walk, sealed, printed."""
    hdr, vals = _q4_parse(s)
    head = _q4_build(vals)
    da, db = _Node(0), _Node(0)
    ta, tb = da, db
    while head:
        ta.next = head
        ta = head
        head = head.next
        if head:
            tb.next = head
            tb = head
            head = head.next
    ta.next = None
    tb.next = None
    return _q4_out(_q4_vals(da.next)) + '\n' + _q4_out(_q4_vals(db.next))


_q4_check(_q4_sol_split_alternate, _q4_brute_split_alternate,
          lambda: _q4_list_input(_q4_r.randint(0, 12), [_q4_r.randint(-99, 99) for _ in range(12)]))

add('ll-c-split-alternate', 'Split into alternating chains', _Q4_T, 'cheatsheet', 1200,
    ['linked lists', 'threading'],
    '<p>Split the list into two lists: the first gets positions 1, 3, 5, …; the second gets 2, 4, 6, … — each preserving the original relative order. Print them on two lines. [1,2,3,4,5] → line 1: <code>1 3 5</code>, line 2: <code>2 4</code>.</p>'
    '<p>Odd-even\'s sibling: thread two chains in ONE walk (take a node for chain A, the next for chain B), SEAL both tails (<code>tail.next = null</code> — the last node of each chain still points into the other chain otherwise), done. The seal is the whole bug surface here: forget it and the two "separate" lists stay tangled. O(n)/O(1), no allocations. On a real list the two dummy heads also erase the empty/one-node special cases.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>Two lines: the odd-position values, then the even-position values (either may be <code>EMPTY</code>).</p>',
    _q4_sol_split_alternate,
    ["5\n1 2 3 4 5\n", "4\n1 2 3 4\n", "0\n\n"],
    ["1\n9\n", "2\n1 2\n"],
    lambda: _q4_list_input(_q4_r.randint(0, 40), [_q4_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6)


def _q4_parse_poly(s):
    L = s.strip().split('\n')
    na, nb = map(int, L[0].split())
    a = []
    if na:
        it = iter(L[1].split())
        a = [(int(c), int(e)) for c, e in zip(it, it)]
    b = []
    if nb:
        it = iter(L[2].split())
        b = [(int(c), int(e)) for c, e in zip(it, it)]
    return a, b


def _q4_sol_poly(s):
    a, b = _q4_parse_poly(s)
    out = []
    i = j = 0
    while i < len(a) or j < len(b):
        if j == len(b) or (i < len(a) and a[i][1] > b[j][1]):
            out.append(a[i])
            i += 1
        elif i == len(a) or b[j][1] > a[i][1]:
            out.append(b[j])
            j += 1
        else:
            c = a[i][0] + b[j][0]
            if c != 0:
                out.append((c, a[i][1]))
            i += 1
            j += 1
    return ' '.join(f"{c} {e}" for c, e in out) if out else 'EMPTY'


def _q4_brute_poly(s):
    a, b = _q4_parse_poly(s)
    d = {}
    for c, e in a + b:
        d[e] = d.get(e, 0) + c
    terms = sorted(((e, c) for e, c in d.items() if c != 0), reverse=True)
    return ' '.join(f"{c} {e}" for e, c in terms) if terms else 'EMPTY'


def _q4_gen_poly(maxn=8):
    def poly():
        exps = _q4_r.sample(range(0, 30), _q4_r.randint(0, maxn))
        return sorted(((e, _q4_r.choice([c for c in range(-9, 10) if c != 0])) for e in exps), reverse=True)
    a, b = poly(), poly()
    la = ' '.join(f"{c} {e}" for e, c in a)
    lb = ' '.join(f"{c} {e}" for e, c in b)
    return f"{len(a)} {len(b)}\n{la}\n{lb}\n"


_q4_check(_q4_sol_poly, _q4_brute_poly, _q4_gen_poly)

add('ll-c-add-polynomials', 'Add two polynomials', _Q4_T, 'cheatsheet', 1300,
    ['linked lists', 'merge', 'two pointers'],
    '<p>Two polynomials are stored as lists of (coefficient, exponent) terms in DESCENDING exponent order, one node per term, no duplicate exponents, no zero coefficients. Add them and print the sum\'s terms in descending exponent order, dropping terms whose coefficients cancel to zero. <code>(3 2) (2 1)</code> plus <code>(-3 2) (5 0)</code> gives <code>2 1 5 0</code>.</p>'
    '<p>This is the sorted-merge template with a twist: walk both lists comparing EXPONENTS; on a tie, sum the coefficients and — the twist — SKIP the term entirely when the sum is zero (the cancel-and-drop rule; growing the result with a tail pointer makes the skip free: just don\'t append). The dummy-headed tail-pointer result means the empty answer falls out naturally. O(na + nb)/O(1), one pass — the map-based version is fine too but re-sorts what was already sorted.</p>',
    '<p>The first line contains na and nb (0 ≤ na, nb ≤ 10<sup>4</sup>). Line 2: A\'s terms as 2·na integers <code>c0 e0 c1 e1 …</code> in descending exponent order. Line 3: B\'s likewise. Exponents in [0, 10<sup>9</sup>], coefficients nonzero with |c| ≤ 10<sup>9</sup>.</p>',
    '<p>One line: the sum\'s terms <code>c e c e …</code> in descending exponent order (no zero coefficients), or <code>EMPTY</code> if the sum is the zero polynomial.</p>',
    _q4_sol_poly,
    ["2 2\n3 2 2 1\n-3 2 5 0\n", "1 1\n1 5\n-1 5\n", "0 2\n\n4 3 1 0\n"],
    ["0 0\n\n\n", "1 0\n7 0\n\n", "2 2\n1 1000000000 1 0\n-1 1000000000 -1 0\n"],
    _q4_gen_poly, n_rand=6,
    large=lambda: (lambda n: (lambda exps: (f"{n} {n}\n" + ' '.join(f"{_q4_r.randint(1, 9)} {e}" for e in exps) +
                     '\n' + ' '.join(f"{_q4_r.randint(-9, -1) if i % 2 else _q4_r.randint(1, 9)} {e}" for i, e in enumerate(exps)) + '\n'))(
        sorted(_q4_r.sample(range(10**9), n), reverse=True)))(10000))


def _q4_sol_union_sorted(s):
    a, b = _q4_parse_two(s)
    merged = sorted(a + b)
    out = []
    for v in merged:
        if not out or out[-1] != v:
            out.append(v)
    return _q4_out(out)


def _q4_brute_union_sorted(s):
    """Merge-walk with skip-duplicates on three fronts, on real nodes."""
    a, b = _q4_parse_two(s)
    ha, hb = _q4_build(a), _q4_build(b)
    dummy = _Node(0)
    tail = dummy
    while ha and hb:
        if ha.v <= hb.v:
            cand = ha
            ha = ha.next
        else:
            cand = hb
            hb = hb.next
        if tail is dummy or tail.v != cand.v:
            tail.next = cand
            tail = cand
    rest = ha if ha else hb
    while rest:
        if tail is dummy or tail.v != rest.v:
            tail.next = rest
            tail = rest
        rest = rest.next
    tail.next = None
    return _q4_out(_q4_vals(dummy.next))


_q4_check(_q4_sol_union_sorted, _q4_brute_union_sorted,
          lambda: (lambda na, nb: f"{na} {nb}\n" + ' '.join(map(str, sorted(_q4_r.randint(1, 8) for _ in range(na)))) +
                   '\n' + ' '.join(map(str, sorted(_q4_r.randint(1, 8) for _ in range(nb)))) + '\n')(
              _q4_r.randint(0, 8), _q4_r.randint(0, 8)))

add('ll-c-union-sorted', 'Union of two sorted lists', _Q4_T, 'cheatsheet', 1300,
    ['linked lists', 'merge', 'dedup'],
    '<p>Both lists are sorted and may contain duplicates. Print their UNION: every distinct value that appears in either list, once each, in increasing order. [1,2,2,4] ∪ [2,4,7] → [1,2,4,7].</p>'
    '<p>A composition of two templates you already own: the stable merge-walk (compare heads, take the smaller) with dedup folded in — append a taken node to the tail-pointer result only when its value differs from the result\'s current tail (and remember the tail can be the dummy: the first node always goes in). One pass over both lists, O(na+nb)/O(1), no set, no sort. The "skip when equal to last appended" rule handles duplicates WITHIN a list, ACROSS lists, and in the leftover remainder with the same single test.</p>',
    '<p>The first line contains na and nb (0 ≤ na, nb ≤ 10<sup>4</sup>). Line 2: A\'s values in non-decreasing order. Line 3: B\'s likewise.</p>',
    '<p>One line: the union in increasing order, or <code>EMPTY</code>.</p>',
    _q4_sol_union_sorted,
    ["4 3\n1 2 2 4\n2 4 7\n", "0 0\n\n\n", "3 1\n5 5 5\n5\n"],
    ["0 3\n\n1 1 1\n", "2 2\n-5 3\n-5 3\n"],
    lambda: (lambda na, nb: f"{na} {nb}\n" + ' '.join(map(str, sorted(_q4_r.randint(-50, 50) for _ in range(na)))) +
             '\n' + ' '.join(map(str, sorted(_q4_r.randint(-50, 50) for _ in range(nb)))) + '\n')(
        _q4_r.randint(0, 30), _q4_r.randint(0, 30)), n_rand=6)


def _q4_sol_reverse_alternate(s):
    hdr, vals = _q4_parse(s)
    k = hdr[1]
    out = []
    i = 0
    rev_phase = True
    while i < len(vals):
        seg = vals[i:i + k]
        out += seg[::-1] if rev_phase else seg
        i += k
        rev_phase = not rev_phase
    return _q4_out(out)


def _q4_brute_reverse_alternate(s):
    """Probe-then-flip with a skipping anchor, on real nodes."""
    hdr, vals = _q4_parse(s)
    k = hdr[1]
    dummy = _Node(0, _q4_build(vals))
    group_prev = dummy
    rev_phase = True
    while True:
        # how many nodes remain after group_prev?
        cnt = 0
        probe = group_prev.next
        while probe and cnt < k:
            cnt += 1
            probe = probe.next
        if cnt == 0:
            return _q4_out(_q4_vals(dummy.next))
        if rev_phase:
            prev, cur = None, group_prev.next
            for _ in range(cnt):        # partial reverse-phase groups ARE reversed
                nxt = cur.next
                cur.next = prev
                prev = cur
                cur = nxt
            tail = group_prev.next
            group_prev.next = prev
            tail.next = cur
            group_prev = tail
        else:
            # skip: walk group_prev forward k (or cnt) nodes, untouched
            for _ in range(cnt):
                group_prev = group_prev.next
        rev_phase = not rev_phase


_q4_check(_q4_sol_reverse_alternate, _q4_brute_reverse_alternate,
          lambda: (lambda n, k: _q4_list_input(n, [_q4_r.randint(-99, 99) for _ in range(n)], k))(
              _q4_r.randint(1, 14), _q4_r.randint(1, 4)))

add('ll-c-reverse-alternate', 'Reverse alternate k-groups', _Q4_T, 'cheatsheet', 1800,
    ['linked lists', 'reversal', 'hard'],
    '<p>Reverse the FIRST k nodes, leave the NEXT k as they are, reverse the k after those, and so on, alternating — [1,2,3,4,5,6,7,8] with k = 2 → [2,1,3,4,6,5,7,8]. A partial group at the END is reversed if it lands in a reverse phase and left alone if it lands in a skip phase. Print the result.</p>'
    '<p>K-group reversal\'s harder sibling: same probe-then-flip machinery, plus a SKIP phase that walks the anchor forward without touching nodes. The bookkeeping that breaks the unprepared: after a reverse phase the anchor moves to the group\'s ORIGINAL head (its new tail); after a skip phase it moves to the skipped group\'s LAST node; and the phase flips every group. A partial group needs the probe count (not blind k) so flips never run off the end. O(n)/O(1) — every node is touched at most twice.</p>',
    '<p>The first line contains n and k (1 ≤ k ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: the resulting values.</p>',
    _q4_sol_reverse_alternate,
    ["8 2\n1 2 3 4 5 6 7 8\n", "8 3\n1 2 3 4 5 6 7 8\n", "5 5\n1 2 3 4 5\n"],
    ["1 1\n9\n", "7 2\n1 2 3 4 5 6 7\n", "4 4\n1 2 3 4\n", "6 1\n1 2 3 4 5 6\n"],
    lambda: (lambda n, k: _q4_list_input(n, [_q4_r.randint(-10**6, 10**6) for _ in range(n)], k))(
        _q4_r.randint(1, 40), _q4_r.randint(1, 6)), n_rand=6,
    large=lambda: _q4_list_input(20000, [_q4_r.randint(0, 99) for _ in range(20000)], 7))


def _q4_parse_cyclic(s):
    """Header: na nb nc pos. A own vals, B own vals, shared vals.
    The shared tail's last node links to shared[pos] when pos >= 0 (a cycle);
    nc = 0 implies pos = -1 (no intersection, both lists acyclic)."""
    L = s.strip().split('\n')
    na, nb, nc, pos = map(int, L[0].split())
    a = list(map(int, L[1].split())) if na else []
    b = list(map(int, L[2].split())) if nb else []
    c = list(map(int, L[3].split())) if nc else []
    return na, nb, nc, pos, a, b, c


def _q4_build_cyclic(s):
    na, nb, nc, pos, a, b, c = _q4_parse_cyclic(s)
    shared = _q4_build(c)
    shared_nodes = []
    t = shared
    while t:
        shared_nodes.append(t)
        t = t.next
    if shared_nodes and pos >= 0:
        shared_nodes[-1].next = shared_nodes[pos]
    ha = _q4_build(a)
    hb = _q4_build(b)
    if shared_nodes:
        if ha is None:
            ha = shared_nodes[0]
        else:
            t = ha
            while t.next:
                t = t.next
            t.next = shared_nodes[0]
        if hb is None:
            hb = shared_nodes[0]
        else:
            t = hb
            while t.next:
                t = t.next
            t.next = shared_nodes[0]
    return ha, hb


def _q4_sol_cyclic(s):
    """Floyd twice + entrance case analysis — the O(1)-space method."""
    na, nb, nc, pos, a, b, c = _q4_parse_cyclic(s)
    ha, hb = _q4_build_cyclic(s)

    def detect(head):
        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                return slow
        return None

    def entrance(head, meet):
        p = head
        while p is not meet:
            p = p.next
            meet = meet.next
        return p

    def length_to(head, target):
        n = 0
        cur = head
        while cur is not target:
            cur = cur.next
            n += 1
        return n

    ma, mb = detect(ha), detect(hb)
    if ma is None and mb is None:
        # both acyclic: switch partners
        p, q = ha, hb
        while p is not q:
            p = hb if p is None else p.next
            q = ha if q is None else q.next
        return '-1' if p is None else str(length_to(ha, p))
    if (ma is None) != (mb is None):
        return '-1'      # one cyclic, one not: they cannot share any node
    # both cyclic
    ea, eb = entrance(ha, ma), entrance(hb, mb)
    if ea is eb:
        # entrances coincide: shared stem ends at the entrance; align and walk,
        # stopping no later than the entrance
        la, lb = length_to(ha, ea), length_to(hb, eb)
        p, q = ha, hb
        if la > lb:
            for _ in range(la - lb):
                p = p.next
        else:
            for _ in range(lb - la):
                q = q.next
        while p is not q:
            p = p.next
            q = q.next
        return str(length_to(ha, p))
    # different entrances: intersect iff eb lies on ea's cycle; then the first
    # shared node along A is ea itself (A enters the common cycle first)
    p = ea.next
    while p is not ea:
        if p is eb:
            return str(length_to(ha, ea))
        p = p.next
    return '-1'


def _q4_brute_cyclic(s):
    """Id-set along A, then walk B until it hits a recorded node."""
    na, nb, nc, pos, a, b, c = _q4_parse_cyclic(s)
    ha, hb = _q4_build_cyclic(s)
    seen = {}
    idx = 0
    cur = ha
    while cur and id(cur) not in seen:
        seen[id(cur)] = idx
        cur = cur.next
        idx += 1
    cur = hb
    steps = 0
    while cur and steps <= nb + nc + 1:
        if id(cur) in seen:
            return str(seen[id(cur)])
        cur = cur.next
        steps += 1
    return '-1'


def _q4_gen_cyclic():
    t = _q4_r.random()
    na, nb = _q4_r.randint(0, 6), _q4_r.randint(0, 6)
    if t < 0.3:
        nc, pos = 0, -1
    else:
        nc = _q4_r.randint(1, 6)
        pos = _q4_r.randint(0, nc - 1) if _q4_r.random() < 0.6 else -1
    a = [_q4_r.randint(-99, 99) for _ in range(na)]
    b = [_q4_r.randint(-99, 99) for _ in range(nb)]
    c = [_q4_r.randint(-99, 99) for _ in range(nc)]
    return '\n'.join([f"{na} {nb} {nc} {pos}",
                      ' '.join(map(str, a)) if a else '',
                      ' '.join(map(str, b)) if b else '',
                      ' '.join(map(str, c)) if c else '']) + '\n'


_q4_check(_q4_sol_cyclic, _q4_brute_cyclic, _q4_gen_cyclic)

add('ll-c-cyclic-intersection', 'Intersection when cycles may exist', _Q4_T, 'cheatsheet', 1900,
    ['linked lists', 'Floyd', 'hard', 'case analysis'],
    '<p>Two lists may share a tail AND the shared part may loop back on itself — a cycle. Print the 0-based index along list A of the first node both lists traverse, or −1 if they share nothing. This is the follow-up the intersection page waves off ("what if one list has a cycle?") — here it is the whole problem.</p>'
    '<p>The switch-partners trick infinite-loops on cycles, so the O(1)-space answer is a case analysis on Floyd: (1) neither list cycles — the usual switch trick or length alignment; (2) exactly ONE cycles — they cannot intersect at all (a shared node would drag both chains into the same cycle), answer −1; (3) both cycle — find both cycle ENTRANCES: if the entrances are the SAME node, the Y happens before the cycle, so run the aligned walk bounded by the entrance; if they DIFFER, the lists intersect exactly when B\'s entrance lies on A\'s cycle (walk one lap from A\'s entrance looking for it) — and then the first shared node along A is A\'s entrance itself. Compare NODES throughout.</p>',
    '<p>The first line contains na, nb, nc, pos (0 ≤ na, nb ≤ 10<sup>4</sup>; nc is the shared tail\'s length; pos ≥ 0 means the shared tail\'s LAST node links back to the shared node at index pos, forming a cycle; pos = −1 means no cycle; nc = 0 implies pos = −1; na + nb + nc ≤ 2·10<sup>4</sup>). Line 2: A\'s own na values (before the join). Line 3: B\'s own nb values. Line 4: the nc shared values. Each list is its own part followed by the shared part.</p>',
    '<p>One integer: the index along A of the first shared node, or −1.</p>',
    _q4_sol_cyclic,
    ["3 2 3 -1\n2 4 1\n1 9\n8 4 5\n", "3 2 3 1\n2 4 1\n1 9\n8 4 5\n", "2 3 0 -1\n1 9\n2 6 4\n\n"],
    ["0 0 0 -1\n\n\n\n", "0 2 2 0\n\n5 6\n7 8\n", "1 1 4 3\n1\n2\n3 4 5 6\n", "2 0 2 -1\n7 8\n\n9 10\n"],
    _q4_gen_cyclic, n_rand=8,
    large=lambda: (lambda na, nb, nc: '\n'.join([f"{na} {nb} {nc} {nc // 2}",
                    ' '.join(str(_q4_r.randint(0, 99)) for _ in range(na)),
                    ' '.join(str(_q4_r.randint(0, 99)) for _ in range(nb)),
                    ' '.join(str(_q4_r.randint(0, 99)) for _ in range(nc))]) + '\n')(5000, 5000, 8000))
