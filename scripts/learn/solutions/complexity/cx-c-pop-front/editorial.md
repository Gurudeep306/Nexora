## Intuition
A dynamic array stores its elements contiguously from index 0. Removing the front (`list.pop(0)`, `Array.shift()`, `vector::erase(begin())`) must shift every remaining element one slot left — $\Theta(\text{size})$ per removal. With $10^5$ elements queued and then removed one by one, that is $\sim 5\cdot10^9$ element moves: one innocent-looking line makes the program quadratic.

## Approach
Never move elements. Append to the back of an array as usual and keep an integer `head` — the index of the current front. A removal reads `a[head]` and increments `head`. (A real deque — `collections.deque`, `std::deque`, `ArrayDeque` — achieves the same with a circular buffer.)

Example: `1 3`, `1 4`, `2`, `1 5`, `2` → array `[3, 4, 5]`, head moves 0 → 1 → 2, printing **3** then **4**.

## Why it works
The live queue is always exactly `a[head .. end)`: appends extend the right end, removals advance the left end, and the problem guarantees the queue is never empty at a removal, so `head` never passes the end. The order of elements never changes, so FIFO order is preserved.

## Complexity
Each operation is $O(1)$ (amortised for appends), $\Theta(q)$ total, versus $\Theta(q^2)$ with front deletion. Memory $O(q)$: dead slots before `head` are not reclaimed, which is fine for a single pass (a circular buffer reuses them).

## Pitfalls
- `shift()` in JavaScript and `pop(0)` in Python look $O(1)$ but are not (engines may optimise small cases — do not rely on it).
- Build the output in one buffer; printing $10^5$ lines one call at a time is its own hidden cost.
- If there are no removals the output is empty — do not print a stray line.
