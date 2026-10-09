## Intuition
Now the digits arrive most-significant first — 342 is 3→4→2 — and school arithmetic needs the ONES digits, which sit at the TAILS. A singly linked list gives you no backward access, so every valid approach manufactures back-to-front access somehow. The cheapest way: reversal. Flip both lists, and you're holding the reversed-digit problem you already solved; stream the carry, flip the result back. And as before, with up to 100 digits the integer must never be formed — `long long` dies at ~19 digits, and "just use a big-int library" is disqualified in an interview.

## Approach
Three iterative passes, all $O(1)$ space beyond the output:

```cpp
Node* rev(Node* head) {           // save before you sever
    Node* prev = nullptr;
    Node* cur = head;
    while (cur) {
        Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}

Node* addTwoNumbers(Node* a, Node* b) {   // ones-digit-first version
    int carry = 0;
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    while (a || b || carry) {
        int sum = carry;
        if (a) { sum += a->v; a = a->next; }
        if (b) { sum += b->v; b = b->next; }
        carry = sum / 10;
        tail->next = new Node{sum % 10, nullptr};
        tail = tail->next;
    }
    return dummy.next;
}

// answer:
return rev(addTwoNumbers(rev(headA), rev(headB)));
```

Name the alternatives with costs and the answer is complete: (1) **reverse + stream + reverse** — $O(n)$ time, $O(1)$ space, mutates the inputs; (2) **recurse to both ends, add on the way back**, propagating the carry up through return values — $O(n)$ stack, inputs untouched, but blows up past ~10^4 digits; (3) **copy digits to arrays and add from the ends** — $O(n)$ space, inputs untouched. All three are legitimate; the reversal version is what interviewers want to see because it reuses machinery you already own.

## Why it works
Reversal is an involution on the digit sequence: after `rev`, the head is the ones digit, so the addition loop's invariant — "the built chain holds the true low-order digits of the sum so far, `carry` holds what carries into the next column" — is exactly the reversed-digit problem's invariant. The `a || b || carry` condition absorbs ragged lengths and the final carry (999 + 999 grows a digit with zero special cases). Reversing the sum once more restores most-significant-first order, and since neither input had a leading zero, neither does the sum. Each pass touches every node exactly once.

## Complexity
$O(\max(n_a, n_b))$ time — three linear passes. $O(1)$ extra space beyond the output nodes (the reversal and addition mutate/allocate nodes only). The recursive variant is $O(n)$ stack; the array variant is $O(n)$ space.

## Pitfalls
- Adding forward directly (most-significant column first): you cannot know a column's carry until you've seen all columns to its right — the whole reason this problem exists.
- Forming the integer: 100 digits overflow every machine type; even BigInt "works" but misses the point and most interviewers reject it.
- Forgetting the final reversal of the result: you'd print the sum reversed.
- Loop condition `a && b` instead of `a || b || carry`: truncates the longer number and drops the trailing carry (5 + 999 → wrong length).
- Recursive carry-propagation without an iterative fallback: stack overflow on long inputs; the iterative version is the safe default.
