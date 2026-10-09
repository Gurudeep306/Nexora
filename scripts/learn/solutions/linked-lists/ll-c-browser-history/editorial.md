# ll-c-browser-history — Browser history

## Intuition
Three behaviors define this structure: `back`/`forward` move along a timeline in both directions, and `visit` destroys everything ahead of you. "Both directions" already rules out a singly list — from a held node you cannot reach your predecessor. The natural structure is a **cursor inside a doubly linked list**: `back` is `cur = cur->prev`, `forward` is `cur = cur->next`, and `visit` is a splice at the held node. This is the problem doubly pointers were made for.

## Approach
State is exactly one pointer: `cur`. The list grows behind and (until the next visit) ahead of it.

```cpp
// visit url: forward history dies the moment you overwrite cur->next
Node* nd = new Node{url, cur, nullptr};
cur->next = nd;      // the old forward chain just became unreachable
cur = nd;

// back k: hop at most k times, stopping at the end
while (k-- && cur->prev) cur = cur->prev;
// forward k: symmetric with cur->next
```

Two design points worth saying out loud:
1. **`visit` doesn't need a deletion loop.** Setting `cur->next = nd` detaches the entire forward chain in one write — everything downstream of the old `cur->next` was only reachable through it. "Destroy all forward history" is one pointer assignment. (In a garbage-collected language the chain is reclaimed; in C/C++ a production version would walk-and-free it, which is still O(length of the dead chain) but amortized fine since each node is freed once.)
2. **Clamping is the loop guard.** `back 5` on a 2-deep history lands on the oldest page, not an error: `while (k-- && cur->prev)` naturally stops at the boundary. Same for `forward`.

## Why it works
Invariant: `cur` always points at a live node whose `prev`-chain is the complete back-history and whose `next`-chain (when non-null) is the complete forward-history. `visit` extends the prev-chain by one and nulls the next-chain (the new node's `next` is null and the old next-chain is detached) — matching the spec exactly. `back k`/`forward k` move the cursor along those chains and stop at null, which is precisely "up to k steps, stopping at the ends." Every printed URL is `cur->url` after the hops, so each back/forward reports where it landed. There is no state besides the list and the cursor, so nothing can desync.

## Complexity
$O(1)$ per `visit`. $O(\min(k, \text{history depth}))$ per `back`/`forward` — with $k \le 100$ that is a small constant here; a single call could hop the whole history in the worst case, but each hop is one pointer read. Space $O(\text{pages visited})$; the dead forward chains are unreachable (and freeable in C/C++).

The array alternative — `vector<string> hist; int idx;` with `visit` doing `hist.resize(idx+1); hist.push_back(url)` — also passes and is what many people ship. Be ready to argue why the list is the *design* answer: splicing at a held node is O(1) with no reallocation copies, growth never moves existing data, and a singly list's inability to walk backwards is exactly the lesson this page teaches. The array's `resize` is the tell: truncation is cheap, but every growth can copy the whole buffer.

## Pitfalls
- Singly list: `back` is impossible without an O(depth) walk from the head. The doubly links are the point.
- Forgetting that `visit` must destroy forward history: keeping the old `next` chain means a later `forward` resurrects pages the spec says are gone (fixture 00: after `back 1; visit c`, `forward 2` must land on `c`, not `b`).
- Setting `nd->prev` but not `cur->next` (or vice versa): the two chains desync and forward/back disagree about the timeline.
- Unclamped hops: `back 999` walking off the front is a null dereference. The guard `k-- && cur->prev` is both the clamp and the loop bound.
- Moving the cursor on `visit` but printing nothing / printing on `visit`: the spec prints ONLY for back/forward. Extra lines fail the diff.
- In C, fixed-size URL buffers: 64 chars is fine for the fixtures, but a production version sizes dynamically (`strdup`) — say so rather than pretending `char[64]` is general.
