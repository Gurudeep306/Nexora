# Linked lists judged problems, part 3 (exec'd by ../linked_lists.py)
# Pages: merging-sort, two-lists, regrouping.
import random as _q3_r
import heapq as _q3_heapq

_Q3_T = 'linked-lists'


def _q3_check(fast, brute, gen, rounds=300):
    for _ in range(rounds):
        s = gen()
        a, b = fast(s), brute(s)
        assert a == b, (s, a, b)


def _q3_list_input(n, vals, extra_before=''):
    head = f"{n}" + (f" {extra_before}" if extra_before != '' else '')
    return head + "\n" + (' '.join(map(str, vals[:n])) if vals[:n] else '') + "\n"


def _q3_parse(s):
    L = s.strip().split('\n')
    hdr = list(map(int, L[0].split()))
    vals = list(map(int, L[1].split())) if len(L) > 1 and L[1].strip() else []
    return hdr, vals


def _q3_out(vals):
    return ' '.join(map(str, vals)) if vals else 'EMPTY'


class _Node:
    __slots__ = ('v', 'next')

    def __init__(self, v, nxt=None):
        self.v = v
        self.next = nxt


def _q3_build(vals):
    head = None
    for v in reversed(vals):
        head = _Node(v, head)
    return head


def _q3_vals(head):
    out = []
    while head:
        out.append(head.v)
        head = head.next
    return out


def _q3_merge_nodes(a, b):
    """The stable tail-pointer merge: ties go to a."""
    dummy = _Node(0)
    tail = dummy
    while a and b:
        if a.v <= b.v:
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a if a else b
    return dummy.next


# ═══════════════════════════ merging & merge sort ═══════════════════════════


def _q3_parse_two(s):
    L = s.strip().split('\n')
    na, nb = map(int, L[0].split())
    a = list(map(int, L[1].split())) if na else []
    b = list(map(int, L[2].split())) if nb else []
    return a, b


def _q3_sol_merge_two(s):
    a, b = _q3_parse_two(s)
    return _q3_out(_q3_vals(_q3_merge_nodes(_q3_build(a), _q3_build(b))))


def _q3_brute_merge_two(s):
    a, b = _q3_parse_two(s)
    return _q3_out(sorted(a + b))


def _q3_gen_two_lists(maxn=12):
    na, nb = _q3_r.randint(0, maxn), _q3_r.randint(0, maxn)
    a = sorted(_q3_r.randint(-99, 99) for _ in range(na))
    b = sorted(_q3_r.randint(-99, 99) for _ in range(nb))
    return f"{na} {nb}\n" + (' '.join(map(str, a)) if a else '') + '\n' + (' '.join(map(str, b)) if b else '') + '\n'


_q3_check(_q3_sol_merge_two, _q3_brute_merge_two, _q3_gen_two_lists)

add('ll-c-merge-two', 'Merge two sorted lists', _Q3_T, 'merging-sort', 800,
    ['linked lists', 'merge'],
    '<p>Merge two sorted lists into one sorted list BY RELINKING — no new nodes, no copying values — and print the result. Equal values: elements of the FIRST list come first (the stable tie rule <code>a.val &lt;= b.val</code>).</p>'
    '<p>The tail-pointer pattern: a dummy owns the growing result, a <code>tail</code> pointer marks its last node so appending is one write. When one list empties, attach the other\'s remainder WHOLE — it is sorted and every remaining element is ≥ the last appended one. At most one comparison per output node: O(na + nb) time, O(1) space, zero allocations. This is the merge that makes list merge sort possible.</p>',
    '<p>The first line contains na and nb (0 ≤ na, nb ≤ 10<sup>4</sup>). The second line contains list A\'s na values in non-decreasing order; the third, list B\'s nb values.</p>',
    '<p>One line: the merged values, or <code>EMPTY</code>.</p>',
    _q3_sol_merge_two,
    ["3 4\n1 2 4\n1 3 4 5\n", "0 2\n\n5 9\n", "2 0\n1 1\n\n"],
    ["0 0\n\n\n", "3 3\n2 2 2\n2 2 2\n"],
    _q3_gen_two_lists, n_rand=6,
    large=lambda: (lambda na, nb: f"{na} {nb}\n" + ' '.join(map(str, sorted(_q3_r.randint(0, 999) for _ in range(na)))) +
                   '\n' + ' '.join(map(str, sorted(_q3_r.randint(0, 999) for _ in range(nb)))) + '\n')(10000, 10000))


def _q3_sol_merge_sort(s):
    hdr, vals = _q3_parse(s)
    return _q3_out(sorted(vals))


def _q3_brute_merge_sort(s):
    """Top-down list merge sort: split with the fast-one-ahead guard, cut, recurse, merge."""
    hdr, vals = _q3_parse(s)

    def ms(head):
        if not head or not head.next:
            return head
        slow, fast = head, head.next
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
        second = slow.next
        slow.next = None
        return _q3_merge_nodes(ms(head), ms(second))

    return _q3_out(_q3_vals(ms(_q3_build(vals))))


_q3_check(_q3_sol_merge_sort, _q3_brute_merge_sort,
          lambda: _q3_list_input(_q3_r.randint(0, 12), [_q3_r.randint(-99, 99) for _ in range(12)]))

add('ll-c-merge-sort', 'Sort the list in O(n log n), O(1) space', _Q3_T, 'merging-sort', 1200,
    ['linked lists', 'merge sort', 'divide and conquer'],
    '<p>Sort the list and print it. The expected method is merge sort ON THE LIST: split at the middle with fast/slow, CUT (<code>slow.next = null</code>), recurse on both halves, stable-merge. Θ(n log n) time; O(log n) recursion stack and NO auxiliary array — the merge relinks the original nodes, which is the advantage arrays do not have.</p>'
    '<p>The two details that decide correctness: the split guard (<code>fast = head.next</code> with <code>while (fast &amp;&amp; fast.next)</code>, so a 2-node list splits 1+1 — with a wrong guard it splits 2+0 and the recursion never terminates) and the cut (without it the left tail still points into the right half and the merge corrupts). Copying to an array and sorting also passes the time limit — but be ready to write the real thing, because that is what "sort a linked list" asks.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: the sorted values, or <code>EMPTY</code>.</p>',
    _q3_sol_merge_sort,
    ["4\n4 2 1 3\n", "6\n-1 5 3 3 0 -1\n", "0\n\n"],
    ["1\n7\n", "2\n2 1\n", "5\n5 4 3 2 1\n"],
    lambda: _q3_list_input(_q3_r.randint(0, 40), [_q3_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6,
    large=lambda: _q3_list_input(20000, [_q3_r.randint(-9999, 9999) for _ in range(20000)]))


def _q3_sol_insertion_sort(s):
    hdr, vals = _q3_parse(s)
    # the page's algorithm: detach each input head, sorted-insert into the result
    dummy = _Node(0)
    head = _q3_build(vals)
    while head:
        cur = head
        head = head.next
        p = dummy
        while p.next and p.next.v < cur.v:
            p = p.next
        cur.next = p.next
        p.next = cur
    return _q3_out(_q3_vals(dummy.next))


_q3_check(_q3_sol_insertion_sort, lambda s: _q3_out(sorted(_q3_parse(s)[1])),
          lambda: _q3_list_input(_q3_r.randint(0, 12), [_q3_r.randint(-99, 99) for _ in range(12)]))

add('ll-c-insertion-sort', 'Insertion sort on a list', _Q3_T, 'merging-sort', 1200,
    ['linked lists', 'insertion sort', 'sorted insert'],
    '<p>Sort the list with insertion sort: keep a dummy-headed sorted result; repeatedly detach the input\'s head, scan the result for its slot (<code>while (p.next &amp;&amp; p.next.val &lt; cur.val) p = p.next;</code> — strict &lt; keeps the sort stable, ties insert after equals), and splice with two writes.</p>'
    '<p>O(n<sup>2</sup>) worst case, O(n) on nearly-sorted input, O(1) space, stable — the small-n workhorse every hybrid sort falls back to. On a list the inserts are pointer writes regardless of payload size; on an array they would shift elements. With n up to 5000 the O(n<sup>2</sup>) scan is fine; on adversarial reverse-sorted input at the limit it does ~12.5M comparisons — still fast in every language.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 5000). The second line contains the n values.</p>',
    '<p>One line: the sorted values, or <code>EMPTY</code>.</p>',
    _q3_sol_insertion_sort,
    ["4\n4 2 1 3\n", "5\n-1 5 3 3 0\n", "0\n\n"],
    ["1\n7\n", "3\n3 2 1\n", "4\n1 1 1 1\n"],
    lambda: _q3_list_input(_q3_r.randint(0, 30), [_q3_r.randint(-999, 999) for _ in range(30)]), n_rand=6,
    large=lambda: _q3_list_input(5000, list(range(5000, 0, -1))))


def _q3_sol_merge_k(s):
    L = s.strip().split('\n')
    k = int(L[0])
    heap = []
    lists = []
    line = 1
    for i in range(k):
        n = int(L[line]); line += 1
        vals = list(map(int, L[line].split())) if n else []
        line += 1
        lists.append(vals)
        if vals:
            heap.append((vals[0], i, 0))
    _q3_heapq.heapify(heap)
    out = []
    while heap:
        v, i, j = _q3_heapq.heappop(heap)
        out.append(v)
        if j + 1 < len(lists[i]):
            _q3_heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return _q3_out(out) if out else 'EMPTY'


def _q3_brute_merge_k(s):
    L = s.strip().split('\n')
    k = int(L[0])
    allv = []
    line = 1
    for _ in range(k):
        n = int(L[line]); line += 1
        if n:
            allv += list(map(int, L[line].split()))
        line += 1
    return _q3_out(sorted(allv)) if allv else 'EMPTY'


def _q3_gen_k_lists(k=None, maxn=8):
    k = k if k is not None else _q3_r.randint(1, 5)
    lines = [str(k)]
    for _ in range(k):
        n = _q3_r.randint(0, maxn)
        vals = sorted(_q3_r.randint(-99, 99) for _ in range(n))
        lines.append(str(n))
        lines.append(' '.join(map(str, vals)) if vals else '')
    return '\n'.join(lines) + '\n'


_q3_check(_q3_sol_merge_k, _q3_brute_merge_k, _q3_gen_k_lists)

add('ll-c-merge-k', 'Merge K sorted lists', _Q3_T, 'merging-sort', 1700,
    ['linked lists', 'merge', 'heap'],
    '<p>Merge K sorted lists into one sorted list and print it. The intended method is a min-heap of the K current heads: pop the smallest, append it, push that list\'s successor — O(N log K) for N total nodes, because each node is popped once and pushed once on a heap of size ≤ K.</p>'
    '<p>Sequential pairwise merging (merge list 1 into 2 into 3 ...) re-merges early results repeatedly: O(N·K) worst case — with these limits it still passes, but the heap (or a divide-and-conquer pairwise merge, also O(N log K)) is the answer to name. This is external sorting\'s engine: merging runs too big for memory, K tape heads at a time.</p>',
    '<p>The first line contains K (1 ≤ K ≤ 100). Each of the next K blocks is one list: a line with its length ni (0 ≤ ni, and Σni ≤ 10<sup>4</sup>), then a line with its ni sorted values.</p>',
    '<p>One line: all values merged in non-decreasing order, or <code>EMPTY</code> if every list is empty.</p>',
    _q3_sol_merge_k,
    ["3\n4\n1 4 5 7\n4\n1 2 3 4\n2\n6 8\n", "2\n0\n\n0\n\n"],
    ["1\n3\n2 2 2\n", "4\n1\n5\n1\n3\n1\n4\n1\n1\n"],
    _q3_gen_k_lists, n_rand=6,
    large=lambda: _q3_gen_k_lists(100, 100))


# ═══════════════════════════ two lists ═══════════════════════════


def _q3_parse_intersect(s):
    """Header: na nb nc (nc = shared tail length, 0 = no intersection).
    Then A's own values, B's own values, the shared tail values."""
    L = s.strip().split('\n')
    na, nb, nc = map(int, L[0].split())
    a = list(map(int, L[1].split())) if na else []
    b = list(map(int, L[2].split())) if nb else []
    c = list(map(int, L[3].split())) if nc else []
    return na, nb, nc, a, b, c


def _q3_build_intersect(s):
    na, nb, nc, a, b, c = _q3_parse_intersect(s)
    shared = _q3_build(c)
    ha = _q3_build(a)
    hb = _q3_build(b)
    if shared is not None:
        if ha is None:
            ha = shared
        else:
            t = ha
            while t.next:
                t = t.next
            t.next = shared
        if hb is None:
            hb = shared
        else:
            t = hb
            while t.next:
                t = t.next
            t.next = shared
    return ha, hb, shared


def _q3_sol_intersect(s):
    na, nb, nc, a, b, c = _q3_parse_intersect(s)
    ha, hb, shared = _q3_build_intersect(s)
    # switch partners: equal total routes a+b+c
    p, q = ha, hb
    while p is not q:
        p = hb if p is None else p.next
        q = ha if q is None else q.next
    if p is None:
        return '-1'
    idx = 0
    cur = ha
    while cur is not p:
        cur = cur.next
        idx += 1
    return str(idx)


def _q3_brute_intersect(s):
    na, nb, nc, a, b, c = _q3_parse_intersect(s)
    ha, hb, shared = _q3_build_intersect(s)
    seen = set()
    cur = ha
    while cur:
        seen.add(id(cur))
        cur = cur.next
    cur = hb
    while cur:
        if id(cur) in seen:
            i = 0
            t = ha
            while t is not cur:
                t = t.next
                i += 1
            return str(i)
        cur = cur.next
    return '-1'


def _q3_gen_intersect():
    nc = 0 if _q3_r.random() < 0.35 else _q3_r.randint(1, 5)
    na = _q3_r.randint(0, 5)
    nb = _q3_r.randint(0, 5)
    a = [_q3_r.randint(-99, 99) for _ in range(na)]
    b = [_q3_r.randint(-99, 99) for _ in range(nb)]
    c = [_q3_r.randint(-99, 99) for _ in range(nc)]
    lines = [f"{na} {nb} {nc}",
             ' '.join(map(str, a)) if a else '',
             ' '.join(map(str, b)) if b else '',
             ' '.join(map(str, c)) if c else '']
    return '\n'.join(lines) + '\n'


_q3_check(_q3_sol_intersect, _q3_brute_intersect, _q3_gen_intersect)

add('ll-c-intersection', 'Where do two lists become one?', _Q3_T, 'two-lists', 1200,
    ['linked lists', 'two pointers', 'identity'],
    '<p>Two lists may share their tails: from some node on, both chains run through the SAME nodes (a Y, not a crossing). Print the 0-based index (along list A) of the first shared node, or −1 if the lists never intersect. Shared means shared MEMORY — two nodes with equal values are not an intersection.</p>'
    '<p>The O(1)-space trick: p walks A, q walks B; when a pointer falls off the end it restarts at the other list\'s head. Each pointer\'s route to the first shared node covers a + b (both stems), so they arrive in the SAME round and <code>p == q</code> exits there; with no shared tail both hit null together — the same loop answers "none" with zero cases. Count lengths and align (start the longer pointer |na − nb| ahead) is the other O(1)-space method; the hash set is O(n) space. Compare POINTERS.</p>',
    '<p>The first line contains na, nb and nc (0 ≤ na, nb ≤ 10<sup>4</sup>; nc is the length of the shared tail — nc = 0 means no intersection; na + nb + nc ≤ 2·10<sup>4</sup>). Line 2: A\'s own na values (before the join). Line 3: B\'s own nb values. Line 4: the nc shared tail values. List A is its own part followed by the shared tail; list B likewise.</p>',
    '<p>One integer: the index along A of the first shared node, or −1.</p>',
    _q3_sol_intersect,
    ["3 2 3\n2 4 1\n1 9\n8 4 5\n", "2 3 0\n1 9\n2 6 4\n\n", "0 2 2\n\n5 6\n7 8\n"],
    ["1 1 1\n1\n1\n2\n", "0 0 0\n\n\n\n"],
    _q3_gen_intersect, n_rand=7)


def _q3_sol_dedup_sorted(s):
    hdr, vals = _q3_parse(s)
    out = []
    for v in vals:
        if not out or out[-1] != v:
            out.append(v)
    return _q3_out(out)


def _q3_brute_dedup_sorted(s):
    """Adjacent compare, cur does NOT advance after an unlink."""
    hdr, vals = _q3_parse(s)
    head = _q3_build(vals)
    cur = head
    while cur and cur.next:
        if cur.v == cur.next.v:
            cur.next = cur.next.next
        else:
            cur = cur.next
    return _q3_out(_q3_vals(head))


_q3_check(_q3_sol_dedup_sorted, _q3_brute_dedup_sorted,
          lambda: _q3_list_input(_q3_r.randint(0, 12), sorted(_q3_r.randint(1, 6) for _ in range(12))))

add('ll-c-dedup-sorted', 'Deduplicate a sorted list', _Q3_T, 'two-lists', 800,
    ['linked lists', 'sorted'],
    '<p>The list is sorted. Delete duplicates so each value appears once, keeping the FIRST occurrence, and print the result. [1,1,2,3,3] → [1,2,3].</p>'
    '<p>Sortedness converts "have I seen this?" from a memory problem into an ADJACENCY problem: compare <code>cur.val</code> with <code>cur.next.val</code>, unlink on equality and DON\'T advance cur (three equal in a row must all go — advancing skips the third). O(n) time, O(1) space, no set. The head always survives keep-one dedup (it is a first occurrence), so no dummy is needed here — unlike delete-all-duplicates, where the head can go.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values in non-decreasing order.</p>',
    '<p>One line: the deduplicated values, or <code>EMPTY</code>.</p>',
    _q3_sol_dedup_sorted,
    ["5\n1 1 2 3 3\n", "4\n1 1 1 1\n", "0\n\n"],
    ["1\n5\n", "6\n-2 -2 0 0 7 7\n"],
    lambda: _q3_list_input(_q3_r.randint(0, 40), sorted(_q3_r.randint(-30, 30) for _ in range(40))), n_rand=6)


def _q3_sol_dedup_unsorted(s):
    hdr, vals = _q3_parse(s)
    seen = set()
    out = []
    for v in vals:
        if v not in seen:
            seen.add(v)
            out.append(v)
    return _q3_out(out)


_q3_check(_q3_sol_dedup_unsorted, _q3_sol_dedup_unsorted,
          lambda: _q3_list_input(_q3_r.randint(0, 12), [_q3_r.randint(1, 8) for _ in range(12)]))

add('ll-c-dedup-unsorted', 'Deduplicate, order preserved', _Q3_T, 'two-lists', 1200,
    ['linked lists', 'hash set'],
    '<p>The list is NOT sorted. Delete duplicates keeping each value\'s FIRST occurrence, preserving the original order: [4,2,4,3,2] → [4,2,3].</p>'
    '<p>Adjacency tells you nothing here — duplicates can be anywhere. The standard answer: a seen-set plus a dummy-head prev-walk: at each node, if its value is seen, unlink (prev stays); else register it and advance. O(n) time, O(n) space. If extra space is banned, nested comparison is O(n<sup>2</sup>)/O(1) — say which trade you are making. (Unsorted and order NOT required? Partition duplicates to the end instead — a regrouping-page move.)</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: the surviving values in original order, or <code>EMPTY</code>.</p>',
    _q3_sol_dedup_unsorted,
    ["5\n4 2 4 3 2\n", "4\n1 1 1 1\n", "0\n\n"],
    ["1\n5\n", "6\n7 7 7 8 8 9\n"],
    lambda: _q3_list_input(_q3_r.randint(0, 40), [_q3_r.randint(-50, 50) for _ in range(40)]), n_rand=6,
    large=lambda: _q3_list_input(20000, [_q3_r.randint(0, 9999) for _ in range(20000)]))


# ═══════════════════════════ regrouping ═══════════════════════════


def _q3_sol_swap_pairs(s):
    hdr, vals = _q3_parse(s)
    for i in range(0, len(vals) - 1, 2):
        vals[i], vals[i + 1] = vals[i + 1], vals[i]
    return _q3_out(vals)


def _q3_brute_swap_pairs(s):
    """Anchor + three writes per pair, on real nodes."""
    hdr, vals = _q3_parse(s)
    dummy = _Node(0, _q3_build(vals))
    prev = dummy
    while prev.next and prev.next.next:
        a, b = prev.next, prev.next.next
        a.next = b.next
        b.next = a
        prev.next = b
        prev = a
    return _q3_out(_q3_vals(dummy.next))


_q3_check(_q3_sol_swap_pairs, _q3_brute_swap_pairs,
          lambda: _q3_list_input(_q3_r.randint(0, 12), [_q3_r.randint(-99, 99) for _ in range(12)]))

add('ll-c-swap-pairs', 'Swap adjacent pairs', _Q3_T, 'regrouping', 1200,
    ['linked lists', 'relinking'],
    '<p>Swap every adjacent pair of NODES — [1,2,3,4,5] → [2,1,4,3,5] — and print the result. A leftover odd node is never touched.</p>'
    '<p>Per pair (a, b) after an anchor prev: three writes — <code>a.next = b.next</code>, <code>b.next = a</code>, <code>prev.next = b</code> — then <code>prev = a</code> (the pair\'s new tail). A dummy absorbs "the first pair moves the head", and the loop condition <code>prev.next &amp;&amp; prev.next.next</code> refuses to start a pair without two nodes. Swap NODES, not val fields: value-swapping passes these tests but breaks the moment anything holds pointers INTO the list or nodes carry satellite data — and the relink version is what generalises to k-groups.</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: the resulting values, or <code>EMPTY</code>.</p>',
    _q3_sol_swap_pairs,
    ["5\n1 2 3 4 5\n", "4\n1 2 3 4\n", "0\n\n"],
    ["1\n9\n", "2\n1 2\n"],
    lambda: _q3_list_input(_q3_r.randint(0, 40), [_q3_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6)


def _q3_sol_odd_even(s):
    hdr, vals = _q3_parse(s)
    return _q3_out(vals[0::2] + vals[1::2])


def _q3_brute_odd_even(s):
    """Two chains threaded in one walk, on real nodes."""
    hdr, vals = _q3_parse(s)
    head = _q3_build(vals)
    if not head:
        return 'EMPTY'
    odd, even = head, head.next
    even_head = even
    while even and even.next:
        odd.next = even.next
        odd = odd.next
        even.next = odd.next
        even = even.next
    odd.next = even_head
    return _q3_out(_q3_vals(head))


_q3_check(_q3_sol_odd_even, _q3_brute_odd_even,
          lambda: _q3_list_input(_q3_r.randint(0, 12), [_q3_r.randint(-99, 99) for _ in range(12)]))

add('ll-c-odd-even', 'Odd positions, then even positions', _Q3_T, 'regrouping', 1200,
    ['linked lists', 'relinking'],
    '<p>Regroup the list so nodes at ODD positions (1st, 3rd, 5th...) come first, followed by nodes at even positions, each group in its original relative order: [10,20,30,40,50] → [10,30,50,20,40]. Positions, NOT values — "odd" means 1st/3rd/5th node, not nodes holding odd numbers. Restate that out loud before coding; the misread is famous.</p>'
    '<p>Two chains grow inside one walk: <code>odd.next = even.next; odd = odd.next; even.next = odd.next; even = even.next</code> — and one final write <code>odd.next = evenHead</code> concatenates. The guard <code>even &amp;&amp; even.next</code> protects the stride: even is the pointer that can run out mid-round. Zero allocations, O(n)/O(1).</p>',
    '<p>The first line contains n (0 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: the regrouped values, or <code>EMPTY</code>.</p>',
    _q3_sol_odd_even,
    ["5\n10 20 30 40 50\n", "4\n2 1 3 5\n", "0\n\n"],
    ["1\n7\n", "2\n1 2\n"],
    lambda: _q3_list_input(_q3_r.randint(0, 40), [_q3_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6)


def _q3_sol_partition(s):
    hdr, vals = _q3_parse(s)
    x = hdr[1]
    less = [v for v in vals if v < x]
    geq = [v for v in vals if v >= x]
    return _q3_out(less + geq)


def _q3_brute_partition(s):
    """Two dummy chains + seal + concatenate, on real nodes."""
    hdr, vals = _q3_parse(s)
    x = hdr[1]
    less_d, geq_d = _Node(0), _Node(0)
    less, geq = less_d, geq_d
    head = _q3_build(vals)
    while head:
        if head.v < x:
            less.next = head
            less = head
        else:
            geq.next = head
            geq = head
        head = head.next
    geq.next = None                 # SEAL
    less.next = geq_d.next          # concatenate
    return _q3_out(_q3_vals(less_d.next))


_q3_check(_q3_sol_partition, _q3_brute_partition,
          lambda: (lambda n, x: _q3_list_input(n, [_q3_r.randint(-20, 20) for _ in range(n)], x))(
              _q3_r.randint(0, 12), _q3_r.randint(-20, 20)))

add('ll-c-partition', 'Partition around x, stably', _Q3_T, 'regrouping', 1200,
    ['linked lists', 'relinking', 'stability'],
    '<p>Regroup the list so every value &lt; x precedes every value ≥ x, PRESERVING the original relative order inside each group: [1,4,3,2,5,2] with x = 3 → [1,2,2,4,3,5] (equal values go right, in arrival order).</p>'
    '<p>Grow two dummy-headed chains (less, geq) as you walk; then the discipline that decides correctness: SEAL the geq chain (<code>geq.next = null</code> — skip it and the last routed node keeps its old next, re-dragging input nodes into the output) and concatenate with one write <code>less.next = geqD.next</code>. Arrival order in each chain IS the original order — list partition is STABLE for free, unlike quicksort\'s array partition. O(n)/O(1), no array.</p>',
    '<p>The first line contains n and x (0 ≤ n ≤ 10<sup>4</sup>, |x| ≤ 10<sup>9</sup>). The second line contains the n values.</p>',
    '<p>One line: the partitioned values, or <code>EMPTY</code>.</p>',
    _q3_sol_partition,
    ["6 3\n1 4 3 2 5 2\n", "0 5\n\n", "3 3\n3 3 3\n"],
    ["4 -1\n-5 0 -1 7\n", "5 100\n1 2 3 4 5\n"],
    lambda: (lambda n, x: _q3_list_input(n, [_q3_r.randint(-10**6, 10**6) for _ in range(n)], x))(
        _q3_r.randint(0, 40), _q3_r.randint(-10**6, 10**6)), n_rand=6)


def _q3_sol_rotate(s):
    hdr, vals = _q3_parse(s)
    k = hdr[1]
    if not vals:
        return 'EMPTY'
    k %= len(vals)
    if k == 0:
        return _q3_out(vals)
    return _q3_out(vals[-k:] + vals[:-k])


_q3_check(_q3_sol_rotate, _q3_sol_rotate,
          lambda: (lambda n, k: _q3_list_input(n, [_q3_r.randint(-99, 99) for _ in range(n)], k))(
              _q3_r.randint(1, 12), _q3_r.randint(0, 30)))

add('ll-c-rotate', 'Rotate right by k', _Q3_T, 'regrouping', 1200,
    ['linked lists', 'circular'],
    '<p>Move the last k nodes to the front — [1,2,3,4,5] with k = 2 → [4,5,1,2,3] — and print the result. k can exceed the length: rotating by the length is a no-op, so reduce k mod n FIRST (skipping this makes the walk count negative and silently does nothing).</p>'
    '<p>The two-write ring trick: count n (one pass — the only way to get it), close the ring (<code>tail.next = head</code>), walk n − k − 1 hops to the new tail, cut (<code>newTail.next = null</code>), return its old next as the new head. Zero nodes move in memory; the wrap-around becomes an existing pointer instead of a special case. O(n)/O(1).</p>',
    '<p>The first line contains n and k (1 ≤ n ≤ 10<sup>4</sup>, 0 ≤ k ≤ 10<sup>9</sup>). The second line contains the n values.</p>',
    '<p>One line: the rotated values.</p>',
    _q3_sol_rotate,
    ["5 2\n1 2 3 4 5\n", "5 0\n1 2 3 4 5\n", "3 7\n1 2 3\n"],
    ["1 100\n9\n", "9 12\n1 2 3 4 5 6 7 8 9\n"],
    lambda: (lambda n, k: _q3_list_input(n, [_q3_r.randint(-10**6, 10**6) for _ in range(n)], k))(
        _q3_r.randint(1, 40), _q3_r.randint(0, 10**9)), n_rand=6)


def _q3_sol_reorder(s):
    hdr, vals = _q3_parse(s)
    n = len(vals)
    out = []
    i, j = 0, n - 1
    while i <= j:
        out.append(vals[i])
        if i != j:
            out.append(vals[j])
        i += 1
        j -= 1
    return _q3_out(out)


def _q3_brute_reorder(s):
    """Middle + reverse half + zip, on real nodes."""
    hdr, vals = _q3_parse(s)
    head = _q3_build(vals)
    if not head:
        return 'EMPTY'
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    prev, cur = None, slow.next
    slow.next = None
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    second = prev
    first = head
    while second:
        t1, t2 = first.next, second.next
        first.next = second
        second.next = t1
        first, second = t1, t2
    return _q3_out(_q3_vals(head))


_q3_check(_q3_sol_reorder, _q3_brute_reorder,
          lambda: _q3_list_input(_q3_r.randint(1, 12), [_q3_r.randint(-99, 99) for _ in range(12)]))

add('ll-c-reorder', 'L0 → Ln → L1 → Ln−1 → …', _Q3_T, 'regrouping', 1400,
    ['linked lists', 'composition', 'reversal', 'fast/slow'],
    '<p>Regroup the list in place to L0 → Ln → L1 → Ln−1 → … — [1,2,3,4,5,6] → [1,6,2,5,3,4] — and print the result. Nodes must be relinked; copying values into new positions is not the exercise.</p>'
    '<p>The capstone composition, nothing new: a list cannot walk backwards, so MAKE the back half walkable. Phase 1: middle (next-next guard) + cut. Phase 2: reverse the second half (three-pointer flip). Phase 3: zip — save BOTH successors (<code>t1 = first.next, t2 = second.next</code>) before any write, then <code>first.next = second; second.next = t1</code>, advance <code>first = t1, second = t2</code>, stop when the second (shorter-or-equal) chain exhausts. Say the three phases out loud before coding — the plan is the answer; O(n)/O(1).</p>',
    '<p>The first line contains n (1 ≤ n ≤ 10<sup>4</sup>). The second line contains the n values.</p>',
    '<p>One line: the reordered values.</p>',
    _q3_sol_reorder,
    ["6\n1 2 3 4 5 6\n", "5\n1 2 3 4 5\n", "1\n9\n"],
    ["2\n1 2\n", "3\n1 2 3\n", "4\n1 2 3 4\n"],
    lambda: _q3_list_input(_q3_r.randint(1, 40), [_q3_r.randint(-10**6, 10**6) for _ in range(40)]), n_rand=6,
    large=lambda: _q3_list_input(20000, [_q3_r.randint(0, 99) for _ in range(20000)]))
