## Intuition
An array is one contiguous block, so making room at index p means every element from p onwards must move one slot to the right. The elements before p stay where they are.

## Approach
Grow the array by one slot. Shift from the **end backwards**: `a[i] = a[i-1]` for i = n down to p+1, then write `a[p] = x`.

Example `3 8 14 20`, p = 2, x = 11: move 20 → slot 4, 14 → slot 3, write 11 at slot 2 → `3 8 11 14 20`.

## Why it works
Copying right-to-left never overwrites a value before it has been moved: slot i is read (as `a[i-1]` for the next step) only after its own value has already been copied to i+1. Copying left-to-right would smear `a[p]` across the whole tail.

## Complexity
Time $O(n - p)$ for the shift, $O(n)$ worst case (insert at the front). Space $O(1)$ beyond the one extra slot.

## Pitfalls
- p = n is legal: it appends at the end (no shifting).
- Shift direction: backwards, or you overwrite data.
