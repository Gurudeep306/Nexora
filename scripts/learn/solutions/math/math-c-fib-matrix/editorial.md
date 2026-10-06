## Intuition
One Fibonacci step is a linear map:
$$\begin{pmatrix} F_{n+1} \\ F_{n+2} \end{pmatrix} = \begin{pmatrix} 0 & 1 \\ 1 & 1 \end{pmatrix} \begin{pmatrix} F_n \\ F_{n+1} \end{pmatrix}.$$
So $n$ steps are the matrix $Q$ raised to the power $n$. Matrix multiplication is associative, so $Q^n$ can be built by **repeated squaring** in about $\log_2 n \approx 60$ products, the same idea as fast exponentiation of numbers.

## Approach
Compute $Q^n$ by square-and-multiply on $2 \times 2$ matrices mod $M$. Then
$$Q^n = \begin{pmatrix} F_{n-1} & F_n \\ F_n & F_{n+1} \end{pmatrix},$$
and the answer is the top-right entry. The solutions use the equivalent **fast doubling** formulas, which come from squaring that matrix:
$$F_{2k} = F_k (2F_{k+1} - F_k), \qquad F_{2k+1} = F_k^2 + F_{k+1}^2.$$
Walk the bits of $n$ from the top, keeping $(F_k, F_{k+1})$. For each bit, double $k$, and if the bit is 1, step $k$ by one more.

Example: $n = 10$ is binary `1010`, so $k$ goes $1 \to 2 \to 5 \to 10$. The pairs are $(1,1)$, $(1,2)$, $(5,8)$, $(55,89)$, and $F_{10} = 55$.

## Why it works
By induction, $Q^n$ has the form shown (it holds for $n = 1$, and multiplying by $Q$ shifts the entries one step). Comparing $Q^{2k} = (Q^k)^2$ entrywise gives the doubling formulas. Each bit maps $(F_k, F_{k+1})$ to the pair for $2k$ or $2k+1$, so after all bits, $k = n$.

## Complexity
$O(\log n)$ multiplications per query: about 60 doublings, for $O(Q \log n)$ in total. Iterating to $n = 10^{18}$ would take centuries.

## Pitfalls
- $2F_{k+1} - F_k$ can be negative mod $M$. Add $M$ before multiplying.
- $n = 0$ gives $0$.
- Products of two residues are up to $10^{18}$: fine in 64-bit, but not in a JavaScript `Number`. There, split the multiplication or use `BigInt`, and read $n$ as `BigInt`.
