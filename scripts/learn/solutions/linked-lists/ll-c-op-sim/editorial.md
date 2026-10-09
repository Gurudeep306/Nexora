# ll-c-op-sim — A sequence of splices

## Intuition
Six operations, one structure. The trick is not any single operation — it is choosing a structure where every operation in the workload is cheap. `push_front` / `pop_front` are free on any singly list with a head pointer. `push_back` / `pop_back` are NOT: without a **tail pointer** they cost an O(n) walk, and with q up to $2 \cdot 10^5$ end-operations that walk turns the whole run quadratic. A **doubly** list with head AND tail makes all four end-ops two-or-three writes each; `pop_back` is precisely where the singly list dies — you cannot unlink the tail without its predecessor.

## Approach
Hold `head`, `tail`, and a `size` counter. Every end-op touches only the ends:

```cpp
void pushFront(int v) {          // symmetric: pushBack
    Node* nd = new Node{v, nullptr, head};
    if (head) head->prev = nd;   // old head adopts the new one
    else tail = nd;              // first node: it is BOTH ends
    head = nd;
}
void popBack() {                 // needs prev pointers — doubly or nothing
    Node* nd = tail;
    tail = tail->prev;
    if (tail) tail->next = nullptr;
    else head = nullptr;         // list just became empty
    delete nd;
}
```

The empty-list transitions are the whole game: when the list has one node, popping it must null out **both** `head` and `tail`, and pushing onto an empty list must set **both**. Every "if the other end exists, wire it; else fix the other end pointer" line above is one of those transitions.

For `insert i v` and `erase i`, first walk to the node at position i — from the **closer end** (`i <= size/2` → from head, else from tail), so the walk is at most n/2 hops — then splice with the held node in O(1):

```cpp
// insert before cur:
nd->prev = cur->prev; nd->next = cur;
cur->prev->next = nd;
cur->prev = nd;

// erase cur (an interior node):
cur->prev->next = cur->next;
cur->next->prev = cur->prev;
```

Index endpoints route to the end-ops: `insert 0` is `pushFront`, `insert size` is `pushBack`, `erase 0` is `popFront`, `erase size-1` is `popBack` — which also guarantees the interior splice never dereferences a null `prev` or `next`.

## Why it works
Invariant: `head`/`tail` always name the real ends, `size` is the true length, and every interior node's `prev`/`next` agree with its neighbors. Each operation maintains it by construction: end-ops rewrite only end pointers and the one adjacent link; interior splices rewrite exactly the two links on each side of the seam. Because ops are guaranteed valid (`erase i` has $0 \le i < \text{size}$, pops only on non-empty), every dereference lands on a live node. Walking from the closer end bounds the middle-op cost at $n/2$ hops.

## Complexity
$O(1)$ for all four end-ops and for the splice itself; $O(\min(i, n-i))$ for the position walk in `insert`/`erase`. A doubly list cannot index in O(1) — that is an array's superpower, and it is the honest trade-off to state. Total $O(q + \text{walks})$; on end-dominated workloads (the large test) it is pure $O(q)$. Space $O(n)$.

The pragmatic alternative is `std::deque` / `collections.deque`: O(1) at both ends, no pointer bookkeeping. It passes and is often the right production call — but it hides exactly the pointer transitions this page wants you to own, and its middle `insert`/`erase` are O(n) shifts, not O(1) splices. The real list teaches the mechanics; the deque ships the product. Say which you are doing and why.

## Pitfalls
- Forgetting `tail = nd` when pushing onto an empty list (or `tail = nullptr` when popping the last node): the two ends must stay consistent, and the one-node transitions are where they desync.
- `pop_back` on a singly list: no predecessor pointer means an O(n) walk per pop — quadratic on the large test. This is why the structure is doubly.
- Interior splice without routing endpoints to the end-ops: `cur->prev->next` segfaults when `cur` is the head.
- Advancing the size counter in the wrong branch or not at all: `insert size` and `erase size-1` decisions depend on it.
- Building the output with per-value `printf` calls on 2·10^5 nodes: fine here, but accumulate into one buffer/string and print once when the output is large.
