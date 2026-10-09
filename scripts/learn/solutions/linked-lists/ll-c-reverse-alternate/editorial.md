## Intuition
K-group reversal's harder sibling: the same probe-then-flip machinery, plus a SKIP phase that walks the anchor forward without touching nodes, and a phase flag that flips every group. Three pieces of bookkeeping break the unprepared: (1) a partial group at the end must be PROBED — count what's actually there, don't flip blind k or you run off the list; (2) after a REVERSE phase the anchor moves to the group's ORIGINAL head (which is now the group's tail); (3) after a SKIP phase it moves to the skipped group's LAST node. Get those three right and the alternation is just `phase = !phase`.

## Approach
`anchor` is the node just BEFORE the current group (start: a dummy head, so the first group needs no special case). Per group: probe `cnt = min(k, remaining)` nodes; if in reverse phase, flip exactly those `cnt`; otherwise just walk past them.

```cpp
Node dummy{0, nullptr};
dummy.next = head;
Node* anchor = &dummy;
bool doReverse = true;
while (anchor->next) {
    // PROBE: count min(k, remaining) nodes of this group
    Node* probe = anchor->next;
    int cnt = 1;
    while (cnt < k && probe->next) { probe = probe->next; cnt++; }
    if (doReverse) {
        Node* groupHead = anchor->next;
        Node* after = probe->next;      // first node past the group
        Node* prev = after;             // flip so the tail links onward directly
        Node* cur = groupHead;
        while (cur != after) {
            Node* nxt = cur->next;
            cur->next = prev;
            prev = cur;
            cur = nxt;
        }
        anchor->next = prev;            // prev == probe: group's new head
        anchor = groupHead;             // original head is now the group's TAIL
    } else {
        anchor = probe;                 // skipped group's LAST node
    }
    doReverse = !doReverse;
}
return dummy.next;
```

Seeding `prev = after` before the flip means the reversed group's new tail (the original head) already points at the rest of the list — no post-flip stitching. The probe doubling as the group's last node makes `after` free.

## Why it works
Invariant: at the top of each round, everything up to `anchor` is final and correctly linked, and `anchor->next` starts the untouched remainder. The probe counts exactly the nodes that exist — a partial group gets `cnt < k`, so the flip loop `while (cur != after)` never dereferences null; reversing `cnt` nodes in a reverse phase and leaving them in a skip phase is exactly the spec ("a partial group is reversed if it lands in a reverse phase, left alone in a skip phase"). Inside a flip, the standard save-before-sever loop moves each of the `cnt` nodes once, and because `prev` started at `after`, the final write `groupHead->next = after` happens naturally as the loop's last flip. `anchor->next = prev` splices the reversed block in; `anchor = groupHead` positions the anchor after it (it is the block's tail now). A skip phase touches no pointers and simply advances the anchor to `probe`. The phase flag flips once per group, alternating reverse/skip. Each node is probed once and flipped at most once: $O(n)$ with every node touched at most twice.

## Complexity
$O(n)$ time — one probe pass and at most one flip pass per node. $O(1)$ space — a constant number of pointers. The "count total nodes first, then decide" variant is also $O(n)$ but needs two passes; probing per group does it in one.

## Pitfalls
- Blind k-flip without probing: on a partial group you walk off the end (null dereference) or silently reverse fewer nodes with corrupted links. Probe first.
- Anchor after a reverse phase set to `probe` (the new head) instead of `groupHead` (the new tail): the next group starts at the wrong node — you'd re-reverse or skip nodes already processed.
- Anchor after a skip phase left at the group's first node: same corruption in the other direction. The skip anchor is the LAST skipped node.
- Forgetting `prev = after` seeding (or equivalently a post-flip `groupHead->next = after`): the reversed block dangles and the rest of the list is lost.
- Flipping the phase per NODE instead of per GROUP, or starting in skip phase: [1..8] with k=2 must give 2 1 3 4 6 5 7 8 — reverse FIRST.
- Not using a dummy: the first group's splice (`anchor->next = prev`) has no natural anchor when the group starts at the head; the dummy erases that case.
