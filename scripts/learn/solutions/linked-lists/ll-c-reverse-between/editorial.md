## Intuition
Reversing a *sub-range* is the plain reverse plus two bookkeeping problems. First, m may be 1, so the head itself can move — a **dummy head** makes "node before the head" a real object and kills that case. Second, after flipping the range you must sew it back: the node before the range (`anchor`) must point at the range's NEW head, and the range's OLD head — which is now its TAIL — must point at whatever follows. Bookmark that old head BEFORE you start flipping, because once you flip you can no longer find it by walking forward.

## Approach
One pass, five actors: `dummy`, `anchor` (walks to position $m-1$), `rangeHead = anchor->next` (the bookmark), then the standard three-pointer flip run **exactly** $k - m + 1$ times, then two stitches:
```cpp
Node dummy{0, head};
Node* anchor = &dummy;
for (int i = 1; i < m; i++) anchor = anchor->next;   // position m-1
Node* rangeHead = anchor->next;                      // bookmark BEFORE flipping
Node* prev = nullptr;
Node* cur  = rangeHead;
for (int i = 0; i < k - m + 1; i++) {                // exactly that many flips
    Node* nxt = cur->next;
    cur->next = prev;
    prev = cur;
    cur  = nxt;
}
anchor->next   = prev;   // front stitch: new head of the range
rangeHead->next = cur;   // back stitch: old head is now the tail
return dummy.next;
```
After $k-m+1$ flips `cur` sits on the node right AFTER the range (or null), and `rangeHead` is the range's tail whose `next` was just overwritten to point backward — that is exactly why the back stitch uses the bookmark, not a walk.

## Why it works
The flip loop is the plain reverse with a bounded trip count: its invariant is that `prev` heads the reversed prefix of the range and `cur` heads the untouched rest. Running it exactly $k-m+1$ times consumes precisely the range, so at exit `prev` is the range's new head (its old last node) and `cur` is the first node after the range. The front stitch reconnects position $m-1$ to the new head; the back stitch reconnects the new tail (the bookmarked old head, since reversal maps head→tail) to the suffix. Everything outside $[m,k]$ is never dereferenced for writing, so it survives untouched. The dummy guarantees the front stitch is legal even when $m = 1$.

## Complexity
$O(n)$ time — one walk to $m-1$ plus one flip per range node, single pass over the list. $O(1)$ space — a constant number of pointers.

## Pitfalls
- Forgetting the bookmark: after the first flip `rangeHead` is only reachable as the *tail* of the reversed piece; walking forward from `prev` to find it costs another $O(k)$ and, worse, people try `anchor->next` — which has already been relinked.
- Off-by-one on the flip count: $k-m+1$ flips, not $k-m$ and not "until cur is null". One flip too few leaves the last range node pointing the wrong way; flipping to null reverses the entire suffix.
- Anchoring at position m instead of $m-1$: then the front stitch overwrites the wrong `next` and you silently drop a node.
- No dummy head: when $m = 1$ the "anchor" doesn't exist and the head special-case leaks into every branch.
- Back-stitching `cur` before the front stitch is fine order-wise, but stitching `rangeHead->next = prev` (a common typo) builds a 2-cycle and hangs the printer.
