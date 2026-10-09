## Intuition
Merge sort on a list is the *natural* home of merge sort: splitting an array is trivial but merging needs $O(n)$ scratch space; on a list, merging is free (relink) and splitting needs a walk. Flip the difficulty and you get $\Theta(n \log n)$ time with $O(\log n)$ stack and **no auxiliary array** — the advantage arrays do not have.

## Approach
Two operations decide everything.

**Split at the middle, then CUT.** Slow/fast walkers with the guard that makes a 2-node list split 1+1:

```cpp
Node* mid(Node* head) {          // slow ends at index ceil(n/2)-1
    Node* slow = head, *fast = head->next;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    Node* second = slow->next;
    slow->next = nullptr;        // THE CUT — without it the halves aren't separate lists
    return second;
}
```

**Stable-merge with dummy + tail** — exactly the merge-two-lists routine (`<=` so left-half ties come first), attaching the remainder whole.

```cpp
Node* sort(Node* head) {
    if (!head || !head->next) return head;      // 0 or 1 nodes: sorted
    Node* second = mid(head);                   // split + cut
    Node* l = sort(head);
    Node* r = sort(second);
    return merge(l, r);
}
```

## Why it works
Termination rests on the split guard. With `fast = head->next` and `while (fast && fast->next)`, every list of length ≥ 2 splits into two **strictly smaller** non-empty halves (length 2 → 1+1), so recursion bottoms out at length 1. With the wrong guard (`fast = head`) a 2-node list would split 2+0 and the recursion would loop forever. The cut (`slow->next = nullptr`) is what makes the left half an actual list — without it, the left tail still points into the right half and the merge corrupts both chains. Correctness then follows the standard merge-sort argument: single nodes are sorted; merging two sorted chains by repeatedly taking the smaller head yields the sorted union; induction on length finishes it. `<=` in the merge keeps equal-valued nodes in left-before-right order — stability.

## Complexity
$\Theta(n \log n)$ time: $\log n$ levels, each level merges $O(n)$ nodes total. $O(\log n)$ recursion stack, $O(1)$ auxiliary space otherwise — zero allocations, the merge relinks the original nodes. Recursion depth is only $\log n$, so no stack-overflow worry (deep recursion is the danger in *linear* recursions like reverse, not here).

## Pitfalls
- `fast = head` instead of `fast = head->next`: 2-node list splits 2+0 → infinite recursion. The guard must ensure both halves are non-empty and smaller.
- Forgetting `slow->next = nullptr`: the "halves" are still one list; the merge walks into memory that the other recursive call is also rewiring.
- Merging with `<` instead of `<=`: still sorted, but not stable — matters when nodes carry satellite data (not visible in these fixtures, but the interview follow-up).
- Returning `head` from `sort` instead of the merge result: after the cut, `head` is only the (now-sorted) left half.
