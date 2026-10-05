## Intuition
A dequeue that finds *out* empty may move the entire *in* stack — $\Theta(q)$ work in a single operation. But an element travels **in → out at most once**: it is pushed onto *in*, moved once, and popped from *out*. So the moves over the whole run are bounded by the number of enqueues.

## Approach
Simulate exactly as described with two array stacks and a move counter:
- `1 x`: push x onto *in*.
- `2`: if *out* is empty, pop every element of *in* and push it onto *out*, counting each move; then pop *out* and print it.

At the end print the move count.

Example `1 10, 1 20, 2, 1 30, 2, 2`: the first dequeue moves 20 and 10 (2 moves) and prints 10; the next prints 20; the last finds *out* empty, moves 30 (1 move), prints 30. Total moves **3**.

## Why it works
Reversing *in* onto *out* puts the oldest element on top of *out*, and every element in *out* is older than every element in *in*, so pops from *out* come out in FIFO order. For cost (aggregate / accounting method): charge each enqueue 3 units — one for its push, one prepaid for its future move, one for its future pop. Every move and pop is then paid in advance, so q operations cost at most $3q$: amortized $O(1)$ each. In particular the printed move count is at most the number of enqueues.

## Complexity
$O(q)$ time total, $O(q)$ memory.

## Pitfalls
- Transfer only when *out* is empty; transferring on every dequeue breaks FIFO order and costs $O(q^2)$.
- Count moves, not transfers: the answer is the number of elements moved.
- Always print the final move count, even if there were no dequeues.
