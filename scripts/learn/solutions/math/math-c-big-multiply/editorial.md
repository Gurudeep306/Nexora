## Intuition
A 2000-digit number is about 6600 bits, so no built-in integer type can hold it. Store the numbers as digit arrays and do what you learned at school: every digit of a times every digit of b. The digits at positions i and j from the right contribute to position $i + j$ of the result.

## Approach
1. Reverse both strings, so index 0 is the units digit.
2. Make an array `col` of length $|a| + |b|$. For every pair, add $a_i \cdot b_j$ to `col[i + j]`.
3. Propagate carries once, left to right: `col[t+1] += col[t] / 10`, `col[t] %= 10`.
4. Read the result from the top, skip leading zeros, and print `0` if nothing is left.

Example: $12 \times 34$. The units digits are $a = (2, 1)$ and $b = (4, 3)$. The columns are $[8,\ 6 + 4,\ 3] = [8, 10, 3]$. Carrying gives $[8, 0, 4]$, which reads $408$.

## Why it works
$a = \sum_i a_i 10^i$ and $b = \sum_j b_j 10^j$, so $ab = \sum_{i,j} a_i b_j 10^{i+j}$. That is exactly the column sums. Carrying rewrites $\sum_t c_t 10^t$ into proper digits without changing its value. The product of an $|a|$-digit and a $|b|$-digit number has at most $|a| + |b|$ digits, so the array is big enough.

## Complexity
$O(|a| \cdot |b|)$, at most $4 \cdot 10^6$ digit products. Memory is $O(|a| + |b|)$. Python's built-in integers are exact and use Karatsuba internally.

## Pitfalls
- A column can collect up to $2000 \cdot 81 = 162{,}000$, which is fine for 32-bit ints. Delaying the carry is what makes it fast.
- A zero operand makes the whole result zero. Print a single `0`, not an empty line or `0000`.
- In Python 3.11+, converting an int with more than 4300 digits to a string raises an error unless you call `sys.set_int_max_str_digits(0)`.
