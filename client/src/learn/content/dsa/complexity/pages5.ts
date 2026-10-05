import type { Page } from '../../../types'

export const expectedAnalysis: Page = {
  id: 'expected-analysis',
  title: 'Expected running time and randomised algorithms',
  summary: 'Linearity of expectation and indicator variables — the two tools behind every average-case and randomised bound — applied to hiring, insertion sort, hashing and quickselect.',
  minutes: 22,
  blocks: [
    {
      t: 'md',
      md: `
        Some algorithms flip coins. Quicksort with a random pivot, quickselect, hashing with a random seed, skip lists, treaps: their running time is a **random variable**, and the honest statement of their cost is its **expectation** — for the *worst* input.

        You need very little probability for this. Two tools do almost all the work.

        ## Tool 1: linearity of expectation

        For any random variables $X$ and $Y$ (on a finite probability space), $E[X + Y] = E[X] + E[Y]$.

        **Proof.** $E[X+Y] = \\sum_{\\omega} (X(\\omega) + Y(\\omega))\\Pr[\\omega] = \\sum_\\omega X(\\omega)\\Pr[\\omega] + \\sum_\\omega Y(\\omega)\\Pr[\\omega]$. ∎

        **No independence is needed.** That is what makes it so powerful: you can split a complicated count into simple pieces, even when the pieces depend on each other.

        ## Tool 2: indicator random variables

        For an event $A$, let $I_A = 1$ if $A$ happens and $0$ otherwise. Then $E[I_A] = 1\\cdot\\Pr[A] + 0\\cdot\\Pr[\\bar A] = \\Pr[A]$.

        **The recipe:** write the quantity you care about as a sum of indicators, $X = \\sum_i I_i$, then $E[X] = \\sum_i \\Pr[\\text{event } i]$. Each probability is usually a one-line argument.
      `,
    },
    {
      t: 'md',
      md: `
        ## Example 1: how often does the maximum change?

        Scan a random permutation of $n$ distinct numbers, keeping the maximum so far. How many times is the maximum updated? (This is the "hiring problem": interview candidates in random order and hire whenever someone beats everyone before.)

        Let $I_i = 1$ if element $i$ is larger than all of elements $1..i-1$. In a uniformly random order, each of the first $i$ elements is equally likely to be the largest among them, so $\\Pr[I_i = 1] = 1/i$. Therefore
        $$ E[\\text{updates}] = \\sum_{i=1}^{n} \\frac1i = H_n \\approx \\ln n. $$
        For $n = 10^6$ that is about 14 updates — while the worst case (sorted input) is $10^6$.

        ## Example 2: insertion sort on a random array

        Insertion sort does exactly one swap per **inversion** (a pair $i < j$ with $a_i > a_j$): each swap fixes one inversion and creates none. For a random permutation, let $I_{ij}$ indicate that pair $(i, j)$ is inverted. By symmetry $\\Pr[I_{ij}] = 1/2$. There are $\\binom n2$ pairs, so
        $$ E[\\text{swaps}] = \\binom n2 \\cdot \\frac12 = \\frac{n(n-1)}{4}. $$
        The average case is half the worst case — still $\\Theta(n^2)$. **Averaging does not rescue a quadratic algorithm.**

        ## Example 3: collisions in a hash table

        Hash $n$ keys uniformly into $m$ buckets. For each pair of keys, let $I_{ij}$ indicate they land in the same bucket: $\\Pr = 1/m$. Expected colliding pairs $= \\binom n2 / m$. With $m = n$ that is about $n/2$ pairs; and the expected length of the chain a lookup scans is $1 + (n-1)/m = O(1 + \\alpha)$ where $\\alpha = n/m$ is the **load factor**. (With $m = 365$ "buckets" and $n = 23$ people, $\\binom{23}{2}/365 \\approx 0.69$ — the birthday paradox.)
      `,
    },
    {
      t: 'md',
      md: `
        ## Tool 3: waiting for a success

        If each attempt succeeds independently with probability $p$, the expected number of attempts until the first success is $1/p$.

        **Proof (first-step analysis).** Let $E$ be the expectation. The first attempt succeeds with probability $p$ (done after 1 attempt); otherwise we have used 1 attempt and face the same situation again: $E = p \\cdot 1 + (1-p)(1 + E)$. Solving, $pE = 1$, so $E = 1/p$. ∎

        ## Example 4: randomised quickselect is O(n) expected

        Quickselect finds the $k$-th smallest element: partition around a random pivot, then recurse into **only the side containing position $k$**.

        Call a pivot **good** if it lands in the middle half of the current range (rank between $\\tfrac14$ and $\\tfrac34$). Then $\\Pr[\\text{good}] = \\tfrac12$, and after a good pivot the range keeps at most $\\tfrac34$ of its elements.

        Group the run into **phases**: phase $j$ is while the range size is in $\\left((\\tfrac34)^{j+1} n, (\\tfrac34)^{j} n\\right]$. A phase ends at the latest at its first good pivot, so by Tool 3 it lasts at most **2 partitions in expectation**, each costing at most $(\\tfrac34)^j n$. By linearity,
        $$ E[\\text{work}] \\le \\sum_{j \\ge 0} 2 \\left(\\tfrac34\\right)^j n = 2n \\cdot \\frac{1}{1 - 3/4} = 8n = O(n). $$
        The worst case (every pivot extreme) is still $\\Theta(n^2)$ — but it needs a long run of bad luck, not a bad input.
      `,
    },
    {
      t: 'code',
      title: 'Randomised quickselect — expected O(n)',
      note: 'k is 0-based: k = 0 returns the minimum. Iterative, so no recursion-depth worries. The array is modified.',
      code: {
        cpp: `#include <random>
#include <vector>
using namespace std;

int quickselect(vector<int>& a, int k) {
    static mt19937 rng(random_device{}());
    int lo = 0, hi = (int)a.size() - 1;
    while (true) {
        if (lo == hi) return a[lo];
        int p = uniform_int_distribution<int>(lo, hi)(rng);
        swap(a[p], a[hi]);
        int i = lo;                                    // Lomuto partition
        for (int j = lo; j < hi; j++)
            if (a[j] < a[hi]) swap(a[i++], a[j]);
        swap(a[i], a[hi]);                             // pivot at its final index i
        if (k == i) return a[i];
        if (k < i) hi = i - 1; else lo = i + 1;        // keep only one side
    }
}`,
        java: `static final java.util.Random RNG = new java.util.Random();

static int quickselect(int[] a, int k) {
    int lo = 0, hi = a.length - 1;
    while (true) {
        if (lo == hi) return a[lo];
        int p = lo + RNG.nextInt(hi - lo + 1);
        int t = a[p]; a[p] = a[hi]; a[hi] = t;
        int i = lo;
        for (int j = lo; j < hi; j++)
            if (a[j] < a[hi]) { t = a[i]; a[i] = a[j]; a[j] = t; i++; }
        t = a[i]; a[i] = a[hi]; a[hi] = t;
        if (k == i) return a[i];
        if (k < i) hi = i - 1; else lo = i + 1;
    }
}`,
        python: `import random

def quickselect(a, k):
    lo, hi = 0, len(a) - 1
    while True:
        if lo == hi:
            return a[lo]
        p = random.randint(lo, hi)
        a[p], a[hi] = a[hi], a[p]
        i = lo
        for j in range(lo, hi):
            if a[j] < a[hi]:
                a[i], a[j] = a[j], a[i]
                i += 1
        a[i], a[hi] = a[hi], a[i]
        if k == i:
            return a[i]
        if k < i:
            hi = i - 1
        else:
            lo = i + 1`,
        js: `function quickselect(a, k) {
  let lo = 0, hi = a.length - 1;
  for (;;) {
    if (lo === hi) return a[lo];
    const p = lo + Math.floor(Math.random() * (hi - lo + 1));
    [a[p], a[hi]] = [a[hi], a[p]];
    let i = lo;
    for (let j = lo; j < hi; j++)
      if (a[j] < a[hi]) { [a[i], a[j]] = [a[j], a[i]]; i++; }
    [a[i], a[hi]] = [a[hi], a[i]];
    if (k === i) return a[i];
    if (k < i) hi = i - 1; else lo = i + 1;
  }
}`,
        c: `#include <stdlib.h>
static void swp(int *x, int *y) { int t = *x; *x = *y; *y = t; }

int quickselect(int *a, int n, int k) {
    int lo = 0, hi = n - 1;
    for (;;) {
        if (lo == hi) return a[lo];
        int p = lo + rand() % (hi - lo + 1);
        swp(&a[p], &a[hi]);
        int i = lo;
        for (int j = lo; j < hi; j++)
            if (a[j] < a[hi]) swp(&a[i++], &a[j]);
        swp(&a[i], &a[hi]);
        if (k == i) return a[i];
        if (k < i) hi = i - 1; else lo = i + 1;
    }
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Average case versus expected time

        These sound alike and are completely different promises:

        | | averages over… | assumption | who can break it |
        |---|---|---|---|
        | **average case** | random *inputs* | inputs follow a distribution (often "uniformly random") | anyone who picks the input — a judge, an attacker |
        | **expected time** | the algorithm's own *coin flips* | the random generator is good | nobody: it holds for every input |

        Naive quicksort (last-element pivot) is $O(n \\log n)$ **on average** but $\\Theta(n^2)$ on sorted input — and judges always include sorted input. Randomised quicksort is $O(n \\log n)$ **expected on every input**.
      `,
    },
    { t: 'viz', algo: 'cx-quicksort', initial: { arr: '1 2 3 4 5 6 7 8 9 10', pivot: 'random', seed: '7' }, caption: 'Already-sorted input — the worst case for a last-element pivot — with random pivots: the tree stays shallow. Change the seed: different shapes, similar cost.' },
    {
      t: 'md',
      md: `
        ## Turning an average-case algorithm into an expected-time one

        If an algorithm is fast on random inputs, **make the input random**: shuffle it first. The Fisher–Yates shuffle produces each of the $n!$ orders with equal probability in $O(n)$:
      `,
    },
    {
      t: 'code',
      title: 'Fisher–Yates shuffle — uniform, O(n)',
      note: 'Swap position i with a uniformly random position in [0, i]. By induction, after processing positions n−1 down to i, every arrangement of the suffix is equally likely.',
      code: {
        cpp: `void shuffleArray(vector<int>& a, mt19937& rng) {
    for (int i = (int)a.size() - 1; i > 0; i--) {
        int j = uniform_int_distribution<int>(0, i)(rng);
        swap(a[i], a[j]);
    }
}`,
        java: `static void shuffle(int[] a, java.util.Random rng) {
    for (int i = a.length - 1; i > 0; i--) {
        int j = rng.nextInt(i + 1);
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }
}`,
        python: `import random

def shuffle(a):                 # same as random.shuffle(a)
    for i in range(len(a) - 1, 0, -1):
        j = random.randint(0, i)
        a[i], a[j] = a[j], a[i]`,
        js: `function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}`,
        c: `#include <stdlib.h>
void shuffle(int *a, int n) {           /* rand() % (i+1) is slightly biased; fine for pivots */
    for (int i = n - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## How likely is "much worse than expected"? Markov's inequality

        For a non-negative random variable $X$ and $t > 0$: $\\Pr[X \\ge t \\cdot E[X]] \\le 1/t$.

        **Proof.** $E[X] \\ge \\sum_{x \\ge tE[X]} x \\Pr[X = x] \\ge tE[X] \\cdot \\Pr[X \\ge tE[X]]$; divide by $tE[X]$. ∎

        So a randomised algorithm with expected time $T$ exceeds $2T$ with probability at most $\\tfrac12$. Run it with a $2T$ budget, restart on timeout: $k$ restarts all fail with probability $\\le 2^{-k}$. For quicksort much stronger bounds hold — it is $O(n\\log n)$ **with high probability** (probability $1 - 1/n^c$) — but Markov alone already shows that bad runs are rare.

        **Las Vegas vs Monte Carlo.** A *Las Vegas* algorithm is always correct and its *time* is random (randomised quicksort). A *Monte Carlo* algorithm has bounded time and is correct *with high probability* (Miller–Rabin primality testing, hashing-based string comparison). Markov plus a time limit converts the first kind into the second.
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Common mistakes',
      md: `- **Multiplying expectations:** E[XY] = E[X]E[Y] needs independence; E[X + Y] = E[X] + E[Y] never does.
- **E[f(X)] ≠ f(E[X])**: the expected *square* of a chain length is not the square of the expected length.
- **A fixed "random" seed is not random** against an adversary who can read your code (contest hacks do exactly this) — seed from the clock or random_device.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'In interviews',
      md: '"Kth largest element" is the classic: sort for O(n log n), a heap of size k for O(n log k), or quickselect for O(n) expected — and say the worst case of quickselect is O(n²), fixed in theory by median-of-medians (O(n) worst case) and in practice by a random pivot. Being able to sketch the 8n argument is a strong signal.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-exp-linearity', 'cx-q-exp-hiring', 'cx-q-exp-inversions', 'cx-q-exp-geometric', 'cx-q-exp-quickselect', 'cx-q-exp-avg-vs-exp', 'cx-q-exp-markov', 'cx-q-exp-birthday'] },
  ],
}

export const amortizedMethods: Page = {
  id: 'amortized-methods',
  title: 'Amortized analysis three ways: aggregate, accounting, potential',
  summary: 'Three proofs of the same kind of bound, each on the binary counter, the multipop stack and a dynamic table that grows and shrinks — plus a queue built from two stacks.',
  minutes: 24,
  blocks: [
    {
      t: 'md',
      md: `
        The amortized-analysis page proved that \`push_back\` is $O(1)$ amortized. Here are the three standard methods in full, applied to three structures. They always prove the same kind of statement:

        > For **every** sequence of $n$ operations starting from an empty structure, the **total** actual cost is at most $\\sum_i \\hat c_i$, where $\\hat c_i$ is the *amortized cost* we assign to operation $i$.

        No probability anywhere — this is a worst-case guarantee on sequences.

        | method | idea | best when |
        |---|---|---|
        | **aggregate** | bound the total cost of n operations directly, divide by n | all operations are alike |
        | **accounting** | overcharge cheap operations, store the surplus as *credit* on specific items, spend it on expensive ones | you can see *which* item pays for what |
        | **potential** | one function Φ of the whole structure stores the prepaid work | the structure is complex, or operations differ |
      `,
    },
    {
      t: 'md',
      md: `
        ## Structure 1: the binary counter

        A $k$-bit counter supports \`increment\`: flip trailing 1s to 0, then the next 0 to 1. One increment can flip all $k$ bits (\`0111…1 → 1000…0\`), so the naive bound for $n$ increments is $O(nk)$.

        **Aggregate.** Bit 0 flips on every increment, bit 1 every second, bit $i$ every $2^i$-th: $\\lfloor n/2^i\\rfloor$ times. Total
        $$ \\sum_{i \\ge 0} \\left\\lfloor \\frac{n}{2^i} \\right\\rfloor < n \\sum_{i\\ge0} \\frac{1}{2^i} = 2n. $$
        So $O(1)$ amortized per increment.

        **Accounting.** Charge **2** per increment. Setting a bit to 1 costs 1; put the other 1 as a credit *on that bit*. Every 1-bit therefore always carries one credit. Resetting a bit to 0 is paid by the credit sitting on it. An increment sets exactly one bit, so 2 per increment covers everything, and credit never goes negative (it is the number of 1s). ∎

        **Potential.** Let $\\Phi$ = number of 1-bits. If an increment resets $t$ bits and sets one, its actual cost is $t + 1$ and $\\Delta\\Phi = 1 - t$, so
        $$ \\hat c = (t + 1) + (1 - t) = 2. $$
      `,
    },
    { t: 'viz', algo: 'cx-binary-counter', caption: 'Each increment’s bar is its actual cost; the variables show Φ and the amortized cost — always 2 (except when the counter wraps).' },
    {
      t: 'code',
      title: 'Binary counter increment',
      code: {
        cpp: `// A[0] is the lowest bit; returns how many bits flipped
int increment(vector<int>& A) {
    int i = 0, flips = 0;
    while (i < (int)A.size() && A[i] == 1) { A[i] = 0; i++; flips++; }
    if (i < (int)A.size()) { A[i] = 1; flips++; }
    return flips;
}`,
        java: `static int increment(int[] A) {
    int i = 0, flips = 0;
    while (i < A.length && A[i] == 1) { A[i] = 0; i++; flips++; }
    if (i < A.length) { A[i] = 1; flips++; }
    return flips;
}`,
        python: `def increment(A):
    i = flips = 0
    while i < len(A) and A[i] == 1:
        A[i] = 0
        i += 1
        flips += 1
    if i < len(A):
        A[i] = 1
        flips += 1
    return flips`,
        js: `function increment(A) {
  let i = 0, flips = 0;
  while (i < A.length && A[i] === 1) { A[i] = 0; i++; flips++; }
  if (i < A.length) { A[i] = 1; flips++; }
  return flips;
}`,
        c: `int increment(int *A, int k) {
    int i = 0, flips = 0;
    while (i < k && A[i] == 1) { A[i] = 0; i++; flips++; }
    if (i < k) { A[i] = 1; flips++; }
    return flips;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## The potential method, stated properly

        Let $D_0$ be the initial structure and $D_i$ the structure after operation $i$. Choose $\\Phi$ with $\\Phi(D_0) = 0$ and $\\Phi(D_i) \\ge 0$ for all $i$. Define $\\hat c_i = c_i + \\Phi(D_i) - \\Phi(D_{i-1})$. Then the sum **telescopes**:
        $$ \\sum_{i=1}^{n} \\hat c_i = \\sum_{i=1}^{n} c_i + \\Phi(D_n) - \\Phi(D_0) \\ge \\sum_{i=1}^{n} c_i. $$
        So the amortized costs are a valid upper bound on the actual total. The whole art is choosing $\\Phi$: it should **rise during cheap operations** and **fall during expensive ones** by about as much as they cost.

        ## Structure 2: the multipop stack

        Operations: \`push(x)\` (cost 1), \`pop()\` (cost 1), \`multipop(k)\` pops $\\min(k, \\text{size})$ items (cost = that number). One multipop can cost $n$, so the naive bound is $O(n^2)$ for $n$ operations.

        - **Aggregate:** each item is popped at most once after being pushed once. Total pops (single or multi) ≤ total pushes ≤ $n$. Total cost ≤ $2n$.
        - **Accounting:** charge 2 per push — 1 for the push, 1 credit stored on the item to pay for its eventual pop. Pops and multipops are then free.
        - **Potential:** $\\Phi$ = stack size. Push: $1 + 1 = 2$. Pop: $1 - 1 = 0$. Multipop of $k'$ items: $k' - k' = 0$.
      `,
    },
    { t: 'viz', algo: 'cx-multipop', caption: 'The tall bars are multipops. They can only remove what earlier pushes put in, so the total stays under 2 × (number of operations).' },
    {
      t: 'md',
      md: `
        ## Structure 3: a table that grows *and* shrinks

        Grow by doubling when full — that we know. Now add \`pop\`, and shrink to save memory. **The obvious rule is wrong:** if we halve the table when it becomes half full, then at the boundary the sequence push, pop, push, pop, … triggers a full copy on *every* operation: $\\Theta(n)$ each.

        **The fix:** halve when the table is only **a quarter** full. After any resize the table is exactly half full, so at least $\\Theta(\\text{size})$ cheap operations must happen before the next resize.

        **Potential.** With $s$ = size and $c$ = capacity,
        $$ \\Phi = \\begin{cases} 2s - c & \\text{if } s \\ge c/2, \\\\ c/2 - s & \\text{if } s < c/2. \\end{cases} $$
        $\\Phi = 0$ right after a resize (half full), and grows as the table drifts towards full ($\\Phi \\to c$) or towards a quarter ($\\Phi \\to c/4$) — exactly the copying cost about to be paid.

        - **Push that doubles** ($s = c$ before): actual $c + 1$; $\\Phi$ goes from $c$ to $2(c+1) - 2c = 2$, so $\\hat c = c + 1 + 2 - c = 3$.
        - **Ordinary push** with $s \\ge c/2$: actual 1, $\\Delta\\Phi = +2$: $\\hat c = 3$. With $s < c/2$: $\\Delta\\Phi = -1$: $\\hat c = 0$.
        - **Pop that halves** ($s$ drops to $c/4$): actual $1 + c/4$; $\\Phi$ goes from $c/2 - (c/4 + 1)$ to $0$, i.e. $\\Delta\\Phi = -(c/4 - 1)$: $\\hat c = 1 + c/4 - c/4 + 1 = 2$.
        - **Ordinary pop:** $\\hat c \\le 1 + 1 = 2$.

        Every operation has amortized cost at most 3, so **any** $n$ operations cost $O(n)$.
      `,
    },
    { t: 'viz', algo: 'cx-dyn-potential', caption: 'Top: the buffer resizing. Middle: actual costs (tall bars = copies). Bottom: amortized costs — never above 3. The meter is Φ, the prepaid work.' },
    {
      t: 'md',
      md: `
        ## Structure 4: a queue from two stacks

        Push onto an \`in\` stack. To pop, take from an \`out\` stack; when \`out\` is empty, move **everything** from \`in\` to \`out\` (which reverses the order, so the oldest item ends on top).

        One pop can move $n$ items. But each item is moved from \`in\` to \`out\` **at most once** in its life: it is pushed once, moved once, popped once — 3 operations per item. **Accounting:** charge 3 per enqueue. **Potential:** $\\Phi = 2\\cdot|\\text{in}|$: enqueue costs $1 + 2 = 3$; a dequeue that moves $m$ items costs $m + 1$ actual and $\\Delta\\Phi = -2m$… so amortized $1 - m \\le 1$. (Any $\\Phi = c\\cdot|\\text{in}|$ with $c \\ge 1$ works.)
      `,
    },
    {
      t: 'code',
      title: 'Queue with two stacks — O(1) amortized per operation',
      code: {
        cpp: `struct TwoStackQueue {
    vector<int> in, out;
    void push(int x) { in.push_back(x); }
    int pop() {                                   // assumes non-empty
        if (out.empty())
            while (!in.empty()) { out.push_back(in.back()); in.pop_back(); }
        int x = out.back(); out.pop_back();
        return x;
    }
    bool empty() const { return in.empty() && out.empty(); }
};`,
        java: `class TwoStackQueue {
    private final ArrayDeque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();
    void push(int x) { in.push(x); }
    int pop() {                                   // assumes non-empty
        if (out.isEmpty())
            while (!in.isEmpty()) out.push(in.pop());
        return out.pop();
    }
    boolean isEmpty() { return in.isEmpty() && out.isEmpty(); }
}`,
        python: `class TwoStackQueue:
    def __init__(self):
        self.inbox, self.outbox = [], []
    def push(self, x):
        self.inbox.append(x)
    def pop(self):                       # assumes non-empty
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())
        return self.outbox.pop()
    def empty(self):
        return not self.inbox and not self.outbox`,
        js: `class TwoStackQueue {
  constructor() { this.in = []; this.out = []; }
  push(x) { this.in.push(x); }
  pop() {                                     // assumes non-empty
    if (!this.out.length) while (this.in.length) this.out.push(this.in.pop());
    return this.out.pop();
  }
  empty() { return !this.in.length && !this.out.length; }
}`,
        c: `#define MAXQ 1000000
typedef struct { int in[MAXQ], out[MAXQ]; int ni, no; } TwoStackQueue;

void q_push(TwoStackQueue *q, int x) { q->in[q->ni++] = x; }
int q_pop(TwoStackQueue *q) {               /* assumes non-empty */
    if (q->no == 0)
        while (q->ni > 0) q->out[q->no++] = q->in[--q->ni];
    return q->out[--q->no];
}`,
      },
    },
    {
      t: 'callout',
      kind: 'warn',
      title: 'When amortized bounds are not enough',
      md: `- **Latency:** amortized O(1) still allows one O(n) operation. A game frame, a trading system or an interrupt handler may need a *worst-case* bound per operation (incremental resizing, real-time deques).
- **Undo / persistence:** if you can roll back to an old version and repeat the expensive operation, the credit is spent twice and the bound collapses.
- **The starting state matters:** the bounds assume we start empty (Φ(D₀) = 0). A counter that starts at 0111…1 can have its first increment cost k.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'In interviews',
      md: '"Implement a queue using stacks" (LeetCode 232) is asked precisely to hear "each element is moved at most once, so pop is amortized O(1)". Likewise for a monotonic stack ("each index is pushed and popped once") and for two pointers. Say the word *amortized* and give the one-line reason.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-am-counter-total', 'cx-q-am-counter-bit', 'cx-q-am-telescoping', 'cx-q-am-multipop', 'cx-q-am-thrash', 'cx-q-am-phi-push', 'cx-q-am-two-stacks', 'cx-q-am-method-match', 'cx-q-am-latency'] },
  ],
}
