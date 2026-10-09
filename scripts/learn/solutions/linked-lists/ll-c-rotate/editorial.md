## Intuition
Rotating right by $k$ moves the last $k$ nodes to the front. Two facts shape the solution: (1) rotating by the length is a no-op, so only $k \bmod n$ matters — and $k$ can be up to $10^9$ while $n \le 10^4$, so skipping the modulo makes every walk count nonsense; (2) a singly list cannot jump from tail to head — so *make it able to*: close the ring with one write, and the wrap-around becomes an existing pointer instead of a special case. Then the rotation is: walk to the new tail, cut.

## Approach
```cpp
// 1. count n and find tail (one pass — the only way to get n)
int n = 0;
Node* tail = head;
for (Node* t = head; t; t = t->next) { tail = t; n++; }

long long k = kInput % n;          // k can exceed n (and int!)
if (k == 0) return head;           // no-op

// 2. close the ring
tail->next = head;

// 3. the new tail is at index n-k-1; walk n-k-1 hops from head
Node* newTail = head;
for (long long i = 0; i < n - k - 1; i++) newTail = newTail->next;

// 4. cut; its old next is the new head
Node* newHead = newTail->next;
newTail->next = nullptr;
return newHead;
```

## Why it works
After closing the ring, the list is the cyclic sequence $L_0 \to L_1 \to \dots \to L_{n-1} \to L_0$. Rotating right by $k$ produces $L_{n-k} \to \dots \to L_{n-1} \to L_0 \to \dots \to L_{n-k-1}$: the new head is the node at index $n-k$, the new tail the node at index $n-k-1$ — exactly where the walk stops after $n-k-1$ hops. Cutting `newTail->next` restores a proper null-terminated list whose content is the original sequence rotated, because the ring walk visits nodes in index order and the cut removes precisely the edge $L_{n-k-1} \to L_{n-k}$, replacing it (conceptually) with the old edge $L_{n-1} \to L_0$ that closing the ring created. Reducing $k \bmod n$ first is valid since rotation by $n$ is the identity permutation.

## Complexity
$O(n)$ time — two walks (count, then position), each ≤ n hops. $O(1)$ space. Zero nodes move in memory; only two pointer writes change.

## Pitfalls
- Not reducing $k \bmod n$: with $k = 10^9$ the hop count $n - k - 1$ is negative — the loop silently does nothing and you print the unrotated list. Worse, in unsigned arithmetic it becomes a huge walk around the ring forever.
- Storing $k$ in a 32-bit signed variable when $k \le 10^9$ fits — but $k$ up to $10^9$ is near `int`'s ceiling; use `long long` and reduce before arithmetic mixing with `int`.
- Walking $n - k$ hops instead of $n - k - 1$: you land on the new head and cut its successor — off by one.
- Forgetting `tail->next = head` (nothing wraps) or forgetting `newTail->next = nullptr` (the "list" stays a ring — printers loop forever).
- $k = 0$: early-return (or let the walk do $n-1$ hops — also correct, but the early return documents the no-op).
