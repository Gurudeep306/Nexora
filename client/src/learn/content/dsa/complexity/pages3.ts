import type { Page } from '../../../types'

export const ramModel: Page = {
  id: 'ram-model',
  title: 'The RAM model: what counts as one step',
  summary: 'The machine every analysis silently assumes — which operations cost 1, which do not, and why big numbers and strings break the illusion.',
  minutes: 15,
  blocks: [
    {
      t: 'md',
      md: `
        "Count the steps" only means something once we agree on **what a step is**. Is \`a + b\` one step? It is in C on two \`int\`s. It is not when \`a\` and \`b\` are 10 000-digit Python integers. Is \`s == t\` one step? Not when the strings are a megabyte long.

        Every complexity you have ever read — in CLRS, on LeetCode, in an interview — quietly assumes one particular machine: the **word RAM**. Knowing exactly what it promises is what lets you spot the lines that cost more than they look.

        ## The word RAM

        - **Memory** is a huge array of *words*. Each word holds $w$ bits. Any word can be read or written **by its address in one step** — that is the "random access" in RAM.
        - **One step** each: arithmetic on words (\`+ − × / %\`), comparisons, bitwise operations (\`& | ^ << >>\`), loading and storing a word, a branch, a function call and return.
        - **The word is big enough to hold an index:** $w \\ge \\log_2 n$. Otherwise you could not even address your input.
        - **But not unboundedly big:** $w = O(\\log n)$ in the strict model. In practice $w = 64$.

        **A step is an operation on a constant number of machine words.** Everything else is a loop in disguise.
      `,
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why the word size has to be limited',
      md: 'If one step could add two numbers of *any* length, you could pack the whole input into one gigantic number and process it in O(1) "steps" — sorting in constant time, a nonsense model. Capping words at O(log n) bits is what makes step counts match real running time.',
    },
    {
      t: 'md',
      md: `
        ## What is *not* one step

        | operation | real cost | why |
        |---|---|---|
        | adding two $d$-digit numbers | $\\Theta(d)$ | one column at a time, with a carry |
        | multiplying two $d$-digit numbers | $\\Theta(d^2)$ school method, $\\Theta(d^{1.585})$ Karatsuba | every digit meets every digit |
        | comparing two strings of length $L$ | $O(L)$ | character by character until they differ |
        | hashing a string of length $L$ | $\\Theta(L)$ | every character feeds the hash |
        | copying an array / slice / substring of length $k$ | $\\Theta(k)$ | one word at a time |
        | \`x in list\`, \`indexOf\`, \`count\` | $\\Theta(n)$ | a scan |
        | \`pow(a, b)\` on doubles | $O(1)$ | hardware floating point — but the answer is approximate |
        | \`pow(a, b)\` on Python ints | grows with the size of $a^b$ | exact big-integer arithmetic |

        Watch the first row happen:
      `,
    },
    { t: 'viz', algo: 'cx-big-add', caption: 'One column per step. The meter ends at the number of digits — the cost of "+" grows with the length of the numbers.' },
    {
      t: 'code',
      title: 'Adding two decimal strings — Θ(d) for d digits',
      note: 'This is what every big-integer library does (with base 2³² or 10⁹ "digits" instead of base 10, which divides the work by a constant).',
      code: {
        cpp: `string addBig(const string& x, const string& y) {
    string r;
    int carry = 0;
    for (int i = (int)x.size() - 1, j = (int)y.size() - 1; i >= 0 || j >= 0 || carry; i--, j--) {
        int s = carry + (i >= 0 ? x[i] - '0' : 0) + (j >= 0 ? y[j] - '0' : 0);
        r.push_back(char('0' + s % 10));
        carry = s / 10;
    }
    reverse(r.begin(), r.end());
    return r;
}`,
        java: `static String addBig(String x, String y) {
    StringBuilder r = new StringBuilder();
    int carry = 0;
    for (int i = x.length() - 1, j = y.length() - 1; i >= 0 || j >= 0 || carry > 0; i--, j--) {
        int s = carry + (i >= 0 ? x.charAt(i) - '0' : 0) + (j >= 0 ? y.charAt(j) - '0' : 0);
        r.append((char) ('0' + s % 10));
        carry = s / 10;
    }
    return r.reverse().toString();
}`,
        python: `def add_big(x: str, y: str) -> str:
    r, carry = [], 0
    i, j = len(x) - 1, len(y) - 1
    while i >= 0 or j >= 0 or carry:
        s = carry + (int(x[i]) if i >= 0 else 0) + (int(y[j]) if j >= 0 else 0)
        r.append(str(s % 10))
        carry = s // 10
        i -= 1
        j -= 1
    return ''.join(reversed(r))`,
        js: `function addBig(x, y) {
  const r = [];
  let carry = 0;
  for (let i = x.length - 1, j = y.length - 1; i >= 0 || j >= 0 || carry; i--, j--) {
    const s = carry + (i >= 0 ? +x[i] : 0) + (j >= 0 ? +y[j] : 0);
    r.push(s % 10);
    carry = Math.floor(s / 10);
  }
  return r.reverse().join('');
}`,
        c: `#include <string.h>
/* out must have room for max(strlen(x), strlen(y)) + 2 bytes */
void add_big(const char *x, const char *y, char *out) {
    int i = (int)strlen(x) - 1, j = (int)strlen(y) - 1, k = 0, carry = 0;
    while (i >= 0 || j >= 0 || carry) {
        int s = carry + (i >= 0 ? x[i--] - '0' : 0) + (j >= 0 ? y[j--] - '0' : 0);
        out[k++] = (char)('0' + s % 10);
        carry = s / 10;
    }
    out[k] = '\\0';
    for (int a = 0, b = k - 1; a < b; a++, b--) { char t = out[a]; out[a] = out[b]; out[b] = t; }
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Worked example: the true cost of \`math.factorial\`-by-hand in Python

        \`\`\`python
        f = 1
        for k in range(2, n + 1):
            f *= k
        \`\`\`

        It looks like $n$ steps. But $f$ grows: after $k$ iterations it is $k!$, which has $\\log_2 k! = \\Theta(k \\log k)$ bits. Multiplying a $\\Theta(k\\log k)$-bit number by a small number $k$ costs $\\Theta(k \\log k)$ word operations (one pass over its words). So the total is

        $$ \\sum_{k=2}^{n} \\Theta(k \\log k) = \\Theta(n^2 \\log n) \\text{ bit operations (up to the word size).} $$

        For $n = 10^5$ the result has about 1.5 million digits — this loop takes seconds, not microseconds. The same trap appears whenever a Python/Java \`BigInteger\` value keeps growing inside a loop. **The fix in contests is almost always "work modulo $p$"**, which keeps every number one word long and every step $O(1)$.

        ## Choosing the "basic operation"

        For a quick analysis we do not count every step — we pick the operation that runs most often and count only that:

        - sorting and searching: **comparisons**;
        - graph algorithms: **edge visits** (relaxations);
        - arithmetic algorithms: **digit / word operations**;
        - string matching: **character comparisons**.

        This is safe as long as every other operation runs at most a constant number of times per basic operation. The basic operation then dominates, and its count is the running time up to a constant.

        ## Other models you will meet

        | model | one step is… | used for |
        |---|---|---|
        | word RAM | an operation on O(log n)-bit words | almost everything |
        | bit complexity | one bit operation | arithmetic on huge numbers, cryptography |
        | comparison model | one comparison between two items | lower bounds for sorting/searching |
        | external memory (I/O) | moving one block between disk and RAM | databases, B-trees |
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Numbers that quietly stop being O(1)',
      md: `- Python ints never overflow — so they silently become big integers. \`2**n\` for n = 10⁶ is a 300 000-digit number.
- Java's \`BigInteger\` and JavaScript's \`BigInt\` have the same costs.
- Strings used as dictionary keys are hashed in O(length), and compared in O(length) on a collision. A map keyed by 10⁵-character strings is not O(1) per lookup.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'In interviews',
      md: 'When you say "O(n)", the interviewer may ask "what about the hashing?" or "how big can these numbers get?". The precise answer names the model: "O(n) operations, each on word-sized integers; if the keys are strings of length L, it is O(n·L)."',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-ram-not-o1', 'cx-q-ram-digits', 'cx-q-ram-unit', 'cx-q-ram-factorial', 'cx-q-ram-word', 'cx-q-ram-why-cap', 'cx-q-ram-basic-op'] },
  ],
}

export const asymptoticProofs: Page = {
  id: 'asymptotic-proofs',
  title: 'Proving the rules of asymptotic notation',
  summary: 'Formal definitions of O, Ω, Θ, o and ω, and short proofs of every rule you use: sums, products, transitivity, polynomials, logarithms and factorials.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        On the Big-O page we used rules like "drop the constants" and "keep the biggest term". Here we prove them. The proofs are short, and doing them once means you will never misapply a rule — and you will be able to handle a function no rule covers.

        ## The five definitions, with quantifiers

        For functions $f, g$ from positive integers to non-negative reals:

        | notation | definition | reads as |
        |---|---|---|
        | $f = O(g)$ | $\\exists c > 0, n_0 : \\forall n \\ge n_0,\\ f(n) \\le c\\,g(n)$ | $f \\preceq g$ |
        | $f = \\Omega(g)$ | $\\exists c > 0, n_0 : \\forall n \\ge n_0,\\ f(n) \\ge c\\,g(n)$ | $f \\succeq g$ |
        | $f = \\Theta(g)$ | both of the above | $f \\asymp g$ |
        | $f = o(g)$ | $\\forall c > 0\\ \\exists n_0 : \\forall n \\ge n_0,\\ f(n) < c\\,g(n)$ | $f \\prec g$ |
        | $f = \\omega(g)$ | $\\forall c > 0\\ \\exists n_0 : \\forall n \\ge n_0,\\ f(n) > c\\,g(n)$ | $f \\succ g$ |

        **Look at the quantifier on $c$.** Big-O needs *one* constant that works; little-o needs *every* constant to work eventually. That single word is the whole difference between "at most as fast" and "strictly slower".

        The "=" is a convention, not an equality: $n = O(n^2)$ is true but $O(n^2) = n$ is meaningless. Read "$f = O(g)$" as "$f \\in O(g)$" — $O(g)$ is a *set* of functions.
      `,
    },
    {
      t: 'steps',
      title: 'The rules, each with its proof',
      items: [
        { title: 'Constant factors: k·f = O(f) for any constant k > 0', md: 'Take $c = k$ and $n_0 = 1$: $k f(n) \\le k \\cdot f(n)$. ∎ (So $5n^2 = O(n^2)$ and also $n^2 = O(5n^2)$ with $c = 1/5$ — constants never change the class.)' },
        { title: 'Sum rule: if f₁ = O(g₁) and f₂ = O(g₂) then f₁ + f₂ = O(max(g₁, g₂))', md: 'We have $f_1 \\le c_1 g_1$ for $n \\ge n_1$ and $f_2 \\le c_2 g_2$ for $n \\ge n_2$. For $n \\ge \\max(n_1, n_2)$: $f_1 + f_2 \\le c_1 g_1 + c_2 g_2 \\le (c_1 + c_2)\\max(g_1, g_2)$. Take $c = c_1 + c_2$. ∎ This is why **sequential code adds and the bigger term wins**.' },
        { title: 'Product rule: if f₁ = O(g₁) and f₂ = O(g₂) then f₁·f₂ = O(g₁·g₂)', md: 'For $n \\ge \\max(n_1, n_2)$, all quantities are non-negative, so $f_1 f_2 \\le (c_1 g_1)(c_2 g_2) = (c_1 c_2) g_1 g_2$. ∎ This is why **nested loops multiply**.' },
        { title: 'Transitivity: f = O(g) and g = O(h) imply f = O(h)', md: '$f \\le c_1 g \\le c_1 c_2 h$ for $n \\ge \\max(n_1, n_2)$. ∎ The same proof works for Ω, Θ, o and ω.' },
        { title: 'Transpose symmetry: f = O(g) exactly when g = Ω(f)', md: '$f \\le c\\,g \\iff g \\ge (1/c) f$. ∎ And Θ is symmetric: $f = \\Theta(g) \\iff g = \\Theta(f)$.' },
        { title: 'Little-o implies Big-O but not Big-Ω', md: 'If $f = o(g)$, the definition with $c = 1$ gives $f \\le g$ eventually, so $f = O(g)$. If also $f = \\Omega(g)$ with constant $c_0$, then $f \\ge c_0 g$ — but little-o with $c = c_0/2$ says $f < (c_0/2) g$ eventually. Contradiction (for $g > 0$). ∎' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Polynomials: only the leading term matters

        **Claim.** If $p(n) = a_k n^k + a_{k-1} n^{k-1} + \\cdots + a_0$ with $a_k > 0$, then $p(n) = \\Theta(n^k)$.

        **Upper bound.** For $n \\ge 1$, every $n^i \\le n^k$, so $p(n) \\le (|a_k| + |a_{k-1}| + \\cdots + |a_0|)\\, n^k$. Take $c = \\sum |a_i|$.

        **Lower bound.** Let $A = |a_{k-1}| + \\cdots + |a_0|$. For $n \\ge 1$ the lower-order part is at least $-A n^{k-1}$, so
        $$ p(n) \\ge a_k n^k - A n^{k-1} = n^{k-1}(a_k n - A). $$
        Once $n \\ge 2A / a_k$ we have $a_k n - A \\ge a_k n / 2$, hence $p(n) \\ge \\tfrac{a_k}{2} n^k$. Take $c = a_k / 2$, $n_0 = \\max(1, 2A/a_k)$. ∎

        Example: $p(n) = 3n^3 - 100n^2 + 7$. The proof says $n_0 = 2 \\cdot 107/3 \\approx 72$: from there on, $p(n) \\ge 1.5\\,n^3$. (For small $n$, $p$ is even negative — asymptotics only care about large $n$.)

        ## Logarithms

        - **Base change:** $\\log_a n = \\dfrac{\\log_b n}{\\log_b a}$, and $1/\\log_b a$ is a positive constant. So $\\log_a n = \\Theta(\\log_b n)$ for all bases $a, b > 1$. ∎
        - **Powers inside:** $\\log(n^k) = k \\log n = \\Theta(\\log n)$ for constant $k > 0$.
        - **Powers outside are different:** $(\\log n)^2$ is **not** $O(\\log n)$ — the ratio is $\\log n \\to \\infty$.
        - **Logs lose to every polynomial:** $\\log^k n = o(n^{\\varepsilon})$ for all constants $k, \\varepsilon > 0$ (proved with limits on the next page).

        ## Factorials: $\\log n! = \\Theta(n \\log n)$ without Stirling

        **Upper:** $n! = 1 \\cdot 2 \\cdots n \\le n \\cdot n \\cdots n = n^n$, so $\\log n! \\le n \\log n$.

        **Lower:** keep only the top half of the factors, each at least $n/2$:
        $$ n! \\ge \\underbrace{\\tfrac n2 \\cdot \\tfrac n2 \\cdots \\tfrac n2}_{n/2 \\text{ factors}} = (n/2)^{n/2}, \\qquad \\log n! \\ge \\tfrac n2 \\log \\tfrac n2 = \\tfrac n2 \\log n - \\tfrac n2. $$
        For $n \\ge 4$, $\\log_2 (n/2) \\ge \\tfrac12 \\log_2 n$, so $\\log n! \\ge \\tfrac14 n \\log n$. ∎ This one inequality is the comparison-sorting lower bound.

        ## $n!$ against $n^n$ and $2^n$

        $$ \\frac{n!}{n^n} = \\frac{1}{n} \\cdot \\frac{2}{n} \\cdots \\frac{n}{n} \\le \\frac1n \\to 0, \\qquad \\text{so } n! = o(n^n). $$
        $$ \\frac{n!}{2^n} = \\frac{1}{2} \\cdot \\frac{2}{2} \\cdot \\frac{3}{2} \\cdots \\frac{n}{2} \\ge \\frac12 \\cdot \\left(\\frac32\\right)^{n-2} \\to \\infty, \\qquad \\text{so } n! = \\omega(2^n). $$

        So $2^n \\prec n! \\prec n^n$ — yet $\\log 2^n$, $\\log n!$ and $\\log n^n$ are $n$, $\\Theta(n \\log n)$ and $n \\log n$. **Taking logs can hide a big gap:** $\\log f = \\Theta(\\log g)$ does *not* imply $f = \\Theta(g)$.
      `,
    },
    { t: 'viz', algo: 'cx-ratio', initial: { f: 'n!', g: 'n^n', ns: '2 4 8 16 32 64 128' }, caption: 'n!/nⁿ collapses towards 0 even though log(n!) and log(nⁿ) are both Θ(n log n).' },
    {
      t: 'md',
      md: `
        ## Stirling's formula, sketched

        For sharper estimates: $\\ln n! = \\sum_{k=1}^{n} \\ln k$. Since $\\ln$ is increasing, each term is trapped between integrals:
        $$ \\int_{1}^{n} \\ln x\\,dx \\;\\le\\; \\sum_{k=2}^{n} \\ln k \\;\\le\\; \\int_{1}^{n+1} \\ln x\\,dx. $$
        With $\\int \\ln x\\,dx = x \\ln x - x$ this gives $n \\ln n - n + 1 \\le \\ln n! \\le (n+1)\\ln(n+1) - n$. A finer analysis (the trapezoid rule plus a correction) yields **Stirling's formula**
        $$ n! = \\sqrt{2\\pi n}\\,\\left(\\frac{n}{e}\\right)^n \\left(1 + O\\!\\left(\\tfrac1n\\right)\\right). $$
        Useful consequences: $\\log_2 n! = n\\log_2 n - n \\log_2 e + O(\\log n) \\approx n \\log_2 n - 1.44n$, and $\\binom{2n}{n} = \\Theta(4^n / \\sqrt n)$.
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The classic false induction',
      md: `"Claim: $\\sum_{i=1}^{n} i = O(n)$. Base: $1 = O(1)$. Step: if $\\sum_{i=1}^{n-1} i = O(n)$ then $\\sum_{i=1}^{n} i = O(n) + n = O(n)$." — The sum is really $n(n+1)/2$, so where is the bug? **O(n) is not a statement about one n** — it hides a constant. Each induction step silently increases the constant, so after n steps it is no constant at all. Induct on an explicit inequality $T(n) \\le c\\,g(n)$ with a *fixed* $c$, never on "= O(…)".`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'In interviews',
      md: 'Nobody will ask for an ε–δ proof, but you will be asked "is O(2ⁿ) the same as O(3ⁿ)?", "is log(n!) linear?", "is O(n + m) the same as O(max(n, m))?" (yes — by the sum rule, since max ≤ n + m ≤ 2·max). Knowing *why* lets you answer instantly and defend it.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-pf-quantifier', 'cx-q-pf-sum-rule', 'cx-q-pf-poly-n0', 'cx-q-pf-logfact', 'cx-q-pf-fact-order', 'cx-q-pf-false-induction', 'cx-q-pf-log-hides', 'cx-q-pf-n-plus-m'] },
  ],
}

export const limitsMethod: Page = {
  id: 'limits-method',
  title: 'Comparing growth rates with limits',
  summary: 'The fastest way to compare two functions: look at f(n)/g(n) as n → ∞. L’Hôpital, the log trick, and a full ranking of tricky functions.',
  minutes: 16,
  blocks: [
    {
      t: 'md',
      md: `
        Is $n^{10}$ smaller than $1.1^n$? For $n = 100$ it is far *bigger* ($10^{20}$ against $\\approx 13\\,780$). Constructing $c$ and $n_0$ by hand for every pair is slow. The **limit test** settles most comparisons in one line.

        ## The limit theorem

        Let $L = \\lim_{n \\to \\infty} \\dfrac{f(n)}{g(n)}$ (when the limit exists). Then
        - $L = 0$ ⟹ $f = o(g)$ — and therefore $f = O(g)$ but $f \\ne \\Omega(g)$;
        - $0 < L < \\infty$ ⟹ $f = \\Theta(g)$;
        - $L = \\infty$ ⟹ $f = \\omega(g)$ — and therefore $f = \\Omega(g)$ but $f \\ne O(g)$.

        **Proof of the middle case.** By the definition of a limit with $\\varepsilon = L/2$, there is $n_0$ such that for $n \\ge n_0$, $|f(n)/g(n) - L| < L/2$, i.e. $\\tfrac L2 g(n) < f(n) < \\tfrac{3L}2 g(n)$. That is $\\Theta(g)$ with $c_1 = L/2$, $c_2 = 3L/2$. ∎ The other two cases are the definitions of $o$ and $\\omega$ in limit form.
      `,
    },
    { t: 'viz', algo: 'cx-ratio', caption: 'n¹⁰ / 1.1ⁿ first explodes, then collapses to 0. Try your own pairs — the early rows can point the wrong way.' },
    {
      t: 'md',
      md: `
        ## Tools for computing the limit

        **L'Hôpital's rule.** If $f, g \\to \\infty$ and are differentiable, $\\lim f/g = \\lim f'/g'$ (when the right side exists).

        - $\\dfrac{\\ln n}{n^{\\varepsilon}} \\to \\dfrac{1/n}{\\varepsilon n^{\\varepsilon - 1}} = \\dfrac{1}{\\varepsilon n^{\\varepsilon}} \\to 0$: **every log loses to every polynomial**, even $n^{0.001}$.
        - $\\dfrac{n^k}{b^n}$ for $b > 1$: differentiate $k$ times, the top becomes the constant $k!$ and the bottom $(\\ln b)^k b^n \\to \\infty$. **Every polynomial loses to every exponential**, even $1.0001^n$.
        - $\\dfrac{(\\ln n)^k}{n^{\\varepsilon}}$: substitute $n = e^m$ to get $m^k / e^{\\varepsilon m} \\to 0$ by the previous line.

        **The ratio test for sequences.** If $f(n+1)/f(n) \\to r$ with $r > 1$, then $f$ grows exponentially. For $n^k / b^n$, the ratio of consecutive terms is $\\left(1 + \\tfrac1n\\right)^k / b \\to 1/b < 1$, so the terms shrink geometrically to 0.

        **The log trick.** Compare $\\log f$ and $\\log g$. If $\\log f - \\log g \\to -\\infty$ then $f/g = 2^{\\log f - \\log g} \\to 0$. Example: $n^{\\log n}$ vs $2^n$: logs are $\\log^2 n$ and $n$; $\\log^2 n - n \\to -\\infty$, so $n^{\\log n} = o(2^n)$. (But remember: the logs being within a constant *factor* proves nothing — $n$ and $n^2$ have logs $\\log n$ and $2\\log n$.)

        ## When the limit does not exist

        $f(n) = n$ for even $n$ and $n^2$ for odd $n$: the ratio $f(n)/n$ bounces between 1 and $n$. Then $f = O(n^2)$ and $f = \\Omega(n)$, but $f$ is neither $\\Theta(n)$ nor $\\Theta(n^2)$, and the limit test is silent. Go back to the definitions. (The running time of an algorithm can look like this: "fast on even sizes, slow on odd".)
      `,
    },
    {
      t: 'md',
      md: `
        ## A ranking worth knowing

        From slowest- to fastest-growing (each line is $o$ of the next, items on one line are $\\Theta$ of each other):

        | function | why it sits here |
        |---|---|
        | $1$, $n^{1/\\log n}$ | $n^{1/\\log_2 n} = 2^{\\log_2 n / \\log_2 n} = 2$ — a constant in disguise |
        | $\\log^* n$ | the number of times you apply log before reaching 1 — at most 5 for any physical $n$ |
        | $\\log \\log n$ | squaring loops, van Emde Boas |
        | $\\log n$, $\\ln n$, $\\log(n^5)$ | bases and inner powers are constants |
        | $\\log^2 n$ | |
        | $\\sqrt n = (\\sqrt2)^{\\log_2 n}$ | |
        | $n = 2^{\\log_2 n}$ | |
        | $n \\log n$, $\\log n!$ | Stirling |
        | $n^2 = 4^{\\log_2 n}$ | |
        | $n^3$ | |
        | $n^{\\log \\log n}$, $(\\log n)^{\\log n}$ | both equal $2^{\\log n \\cdot \\log \\log n}$ |
        | $2^n$ | |
        | $n \\cdot 2^n$ | |
        | $e^n$ | $e^n / 2^n = (e/2)^n \\to \\infty$ |
        | $n!$ | |
        | $n^n$ | |
        | $2^{2^n}$ | |

        The disguises are the point: **rewrite everything as $2^{(\\ldots)}$** and compare the exponents. $4^{\\log_2 n} = 2^{2\\log_2 n} = n^2$ catches people every year.
      `,
    },
    {
      t: 'code',
      title: 'Comparing huge functions safely: work with logarithms',
      note: 'n!, 2ⁿ and nⁿ overflow any number type almost immediately. Their log₂ never does, and f/g = 2^(log f − log g). The same trick is how you compare products of many probabilities.',
      code: {
        cpp: `#include <cmath>
// log2 of n! via lgamma (lgamma(n + 1) = ln n!)
double lgFact(double n) { return lgamma(n + 1) / log(2.0); }
double lgPow(double base, double n) { return n * log2(base); }

// is n! smaller than 3^n?  compare exponents instead of values
bool factSmaller(double n) { return lgFact(n) < lgPow(3, n); }`,
        java: `static double lgFact(int n) {           // log2(n!) by summing logs
    double s = 0;
    for (int k = 2; k <= n; k++) s += Math.log(k);
    return s / Math.log(2);
}
static double lgPow(double base, double n) { return n * Math.log(base) / Math.log(2); }

static boolean factSmaller(int n) { return lgFact(n) < lgPow(3, n); }`,
        python: `import math

def lg_fact(n):                       # log2(n!)
    return math.lgamma(n + 1) / math.log(2)

def lg_pow(base, n):
    return n * math.log2(base)

def fact_smaller(n):                  # n! < 3**n ?
    return lg_fact(n) < lg_pow(3, n)`,
        js: `function lgFact(n) {                     // log2(n!) by summing logs
  let s = 0;
  for (let k = 2; k <= n; k++) s += Math.log2(k);
  return s;
}
const lgPow = (base, n) => n * Math.log2(base);

const factSmaller = (n) => lgFact(n) < lgPow(3, n);`,
        c: `#include <math.h>
double lg_fact(double n) { return lgamma(n + 1) / log(2.0); }   /* log2(n!) */
double lg_pow(double base, double n) { return n * log2(base); }

int fact_smaller(double n) { return lg_fact(n) < lg_pow(3, n); }`,
      },
    },
    {
      t: 'callout',
      kind: 'tip',
      title: 'Ranking functions in an exam or interview',
      md: '1. Convert every function to the form $2^{h(n)}$. 2. Compare the $h$’s: if $h_1 - h_2 \\to \\pm\\infty$ the order is decided. 3. If the $h$’s differ by a bounded amount, the functions are Θ of each other. 4. Sanity-check at a huge $n$ such as $2^{64}$ — not at $n = 10$.',
    },
    { t: 'check', title: 'Check yourself', ids: ['cx-q-lim-zero', 'cx-q-lim-const', 'cx-q-lim-disguise', 'cx-q-lim-order', 'cx-q-lim-nlogn-2n', 'cx-q-lim-no-limit', 'cx-q-lim-poly-exp'] },
  ],
}
