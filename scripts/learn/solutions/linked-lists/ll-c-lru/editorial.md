# ll-c-lru — LRU cache

## Intuition
Two requirements pull in opposite directions: `get`/`put` must be O(1) — that demands a **hashmap** — and eviction must always know the *least* recently used entry while every access reorders by recency — that demands an **ordered structure** where moving an element to the front is cheap. Neither alone suffices. The canonical answer bolts them together: a hashmap key → node, plus a doubly linked list whose order IS the recency (head = most recent, tail = least recent). The map gives O(1) "where is it"; the list gives O(1) "move it to front" and O(1) "drop the tail."

## Approach
Sentinel `head` and `tail` nodes bracket the recency list, so no splice ever null-checks. Two primitives do everything:

```cpp
void unlink(Node* nd) {          // lift nd out, wherever it is
    nd->prev->next = nd->next;
    nd->next->prev = nd->prev;
}
void pushFront(Node* nd) {       // mark most recently used
    nd->next = head.next;
    nd->prev = &head;
    head.next->prev = nd;
    head.next = nd;
}
```

Then:
- **`get k`**: map lookup. Miss → −1. Hit → `unlink(nd); pushFront(nd);` return `nd->v`. That unlink is two writes *because the list is doubly* — with only `next` pointers you'd need an O(n) walk to find nd's predecessor, and the whole O(1) claim collapses. This is the sentence to say in the interview.
- **`put k v`, key exists**: update `nd->v`, then `unlink; pushFront` — an update counts as a use.
- **`put k v`, new key**: create the node, insert in map, `pushFront`. If the map now exceeds C: the LRU entry is exactly `tail.prev` — `unlink` it, **erase its key from the map** (the node stores its own key precisely so this is possible), free it.

Note the node stores both k and v: without `k` in the node, eviction could find the victim node but couldn't remove it from the hashmap.

## Why it works
Invariant: the map's key set equals the list's node set, and list position orders entries by last-use time, most recent at the head side. Every operation that "uses" a key (a get hit, any put) ends with that node immediately after `head` — so the ordering statement is maintained by construction. Since only the head side gains nodes and only `tail.prev` is removed, and removal only happens when size > C, the list never exceeds C nodes and its tail-side node is by definition the one untouched the longest. A miss leaves everything invariant. The two structures cannot drift because every mutation updates both in the same breath (insert: map + pushFront; evict: unlink + map erase).

## Complexity
$O(1)$ expected per operation — hash lookup plus a constant number of pointer writes. $O(C)$ space. Standard-library shortcuts are legitimate and worth knowing: Python `OrderedDict` (`move_to_end`, `popitem(last=False)`), Java `LinkedHashMap` with `accessOrder=true` and `removeEldestEntry` — but be ready to draw the map+doubly-list version, because "now implement it without the built-in" is the standard follow-up, and the drawing IS the answer.

## Pitfalls
- Singly list: `get`'s move-to-front needs the predecessor → O(n) walk → the O(1) promise is broken. Doubly is not a luxury here; it's the requirement.
- Forgetting `mp.erase(lru->k)` on eviction: the map keeps a dangling key, a later `get` returns freed memory (C/C++) or a ghost entry, and the size check miscounts.
- Not storing the key in the node: you find the LRU node at the tail but have no way to name it in the map.
- Update-put not refreshing recency: `put 1 2` on existing key 1 must move 1 to the front, not just overwrite — otherwise eviction picks the wrong victim (fixture 01: capacity 1, `put 1 1; put 1 2; get 1` → 2).
- Eviction check placed before insertion, or using `>= C` instead of `> C` after inserting: off-by-one evicts too early and drops live entries.
- No sentinels: every splice grows `if (nd == head) / if (nd == tail)` branches, and one missed branch corrupts the list on the first or last node. Sentinels make the real nodes all interior.
- Recursive or lambda-captured `head`/`tail` in C++ pointing at sentinels that go out of scope: keep them alive for the whole run (here they live in `main` or are static).
