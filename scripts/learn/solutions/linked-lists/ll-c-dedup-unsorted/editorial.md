## Intuition
Without sortedness, adjacency tells you nothing — a repeat of the first node can hide at position 9000. "Have I seen this value?" needs actual memory: a **hash set** of seen values. Then the list side is pure mechanics: walk behind a `prev` pointer (parked on a dummy so the head gets no special treatment), and at each node either unlink it (value already seen — `prev` stays) or register the value and advance. First occurrences are never touched, so the original order survives for free.

## Approach
```cpp
unordered_set<int> seen;
Node dummy{0, nullptr};
dummy.next = head;
Node* prev = &dummy;
while (prev->next) {
    Node* cur = prev->next;
    if (seen.count(cur->v)) {
        prev->next = cur->next;    // unlink; prev stays — the NEXT node may also be a repeat
    } else {
        seen.insert(cur->v);
        prev = cur;                // keep: cur becomes the new anchor
    }
}
return dummy.next;
```

The structure is the mirror image of sorted dedup: there, `cur` compared forward and stayed put; here, `prev` looks at `prev->next` and stays put on unlink — because after removing a repeat, the *next* candidate also needs testing against the set.

## Why it works
Invariant: the chain from the dummy through `prev` consists exactly of the kept nodes — one per distinct value, in first-occurrence order — and `seen` contains precisely their values. For the next node `cur = prev->next`: if `cur->v ∈ seen`, an earlier node with that value was kept, so `cur` is a repeat and unlinking preserves the invariant (only nodes after `cur` remain untouched, `prev` unchanged). Otherwise `cur->v` appears for the first time, so keeping it and adding the value preserves the invariant. Each iteration either removes one node or advances `prev`, so it terminates; at the end every value appears exactly once, at its first-occurrence position.

## Complexity
$O(n)$ expected time — one hash lookup + one insert per node. $O(n)$ space for the set: that is the honest price of "unsorted + keep order". If extra space is banned, the fallback is nested comparison — for each node, scan the prefix for its value — $O(n^2)$ time, $O(1)$ space; say which trade you are making. (If order did *not* matter you could instead partition duplicates to the end — a regrouping move, no set.)

## Pitfalls
- Advancing `prev` after an unlink: the node now sitting at `prev->next` never gets tested, so two consecutive repeats both survive.
- Inserting into `seen` before the membership test (or testing after inserting): every node "is seen" and the whole list evaporates. Test, then insert on the keep branch.
- Skipping the dummy: deleting the head — impossible here (the head is always a first occurrence), but the dummy costs one node and buys uniformity; and it is *mandatory* in the delete-all-duplicates variant.
- Using a sorted structure (`std::set`, TreeSet): $O(n \log n)$ instead of $O(n)$ — fine, but the expected answer names the hash set.
- Assuming small value ranges and using a direct-address array: correct, and even faster — but mention the range assumption; the hash set is the general answer.
