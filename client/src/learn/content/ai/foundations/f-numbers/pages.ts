import type { Page } from '@/learn/types'
import { intervalsScene, kindsScene, nestScene, sciTex, setOpsScene, spacesScene, sqrt2Fractions, sqrt2Scene } from './scenes.ts'

const fr = sqrt2Fractions(10)

export const why: Page = {
  id: 'why',
  title: 'Why an AI course starts with numbers',
  summary: 'A computer cannot see a cat. It can only see numbers. So we begin with the language of numbers.',
  minutes: 4,
  blocks: [
    {
      t: 'md',
      md: `Suppose you want a computer to look at a photo and say "cat" or "dog". You see fur, ears and whiskers. The computer sees none of that. A photo, to a computer, is a long list of numbers: how bright each tiny dot (a **pixel**) is. A small grey photo 28 dots wide and 28 dots tall is 28 × 28 = 784 numbers.

Everything an AI model works with is like this. A word becomes a list of numbers. A sound becomes a list of numbers. Your exam marks are already numbers. The model's answer, "how sure am I that this is a cat", is a number too.

So before we can teach a computer anything, we need a clear language for numbers:

- **which kinds of numbers there are** (some can't be written as fractions, and that matters),
- **how to talk about groups of things** (all the photos, all the students who passed),
- **how to talk about a stretch of numbers** ("any mark from 40 to 100").

## What you will be able to do

By the end of this topic you will be able to say exactly which kind of number something is, read and write set notation ($\\in$, $\\cup$, $\\cap$), write a range of numbers as an interval like $[0, 1]$, and see why a list of $n$ numbers is a point in a space called $\\mathbb R^n$. Every later course uses all four.`,
    },
    {
      t: 'callout',
      kind: 'note',
      title: 'How to read this course',
      md: 'Each page starts with an example, then gives the idea a name, then the symbols. Press Play on any animation, or step through it with the arrows. Underlined words in a caption light up what they name.',
    },
  ],
}

export const kinds: Page = {
  id: 'kinds',
  title: 'Kinds of numbers',
  summary: 'Counting numbers, then zero and negatives, then fractions, then the numbers in between: each kind was invented because the one before was not enough.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `People did not invent all numbers at once. Each new kind appeared when the old kinds could not answer a question. Watch them arrive on one line.`,
    },
    { t: 'stage', scene: kindsScene() },
    {
      t: 'md',
      md: `## Counting numbers: ℕ

The first numbers are the ones you count with: 1, 2, 3, and so on without end. They are the **natural numbers**, written $\\mathbb N$.

$$\\mathbb N = \\{1, 2, 3, 4, \\dots\\}$$

The three dots mean "and so on, forever". (Some books start $\\mathbb N$ at 0. In this course it starts at 1; when we need 0 too we will say so.)

## Zero and negatives: ℤ

Counting numbers can't answer "what is 3 − 5?". If you have ₹3 and spend ₹5, you owe ₹2: you have −2 rupees. Adding 0 and the negatives gives the **integers**, written $\\mathbb Z$ (from the German *Zahlen*, "numbers").

$$\\mathbb Z = \\{\\dots, -3, -2, -1, 0, 1, 2, 3, \\dots\\}$$

## Fractions: ℚ

Integers can't answer "what is 1 ÷ 2?". Sharing one roti between two people gives each half a roti. A **rational number** is any number you can write as one integer divided by another, $\\frac{p}{q}$, where $q$ is not 0. They are written $\\mathbb Q$ (for *quotient*, the result of a division).

$$\\mathbb Q = \\left\\{\\tfrac{p}{q} : p, q \\in \\mathbb Z,\\ q \\neq 0\\right\\}$$

Read this as: "all numbers $\\frac pq$, where $p$ and $q$ are integers and $q$ is not zero". Decimals that stop, like $0.25 = \\frac{1}{4}$, are rational. So are decimals that repeat forever, like $0.333\\ldots = \\frac13$. Every integer is rational too: $5 = \\frac51$.

## Every point on the line: ℝ

You might think fractions fill the whole line: between any two fractions there is always another one (their average). Surprisingly, there are still gaps. The length of the diagonal of a 1 × 1 square is $\\sqrt 2$, and $\\sqrt 2$ is **not** a fraction. The next page proves it. Nor is $\\pi$, the distance round a circle of width 1.

Filling every gap gives the **real numbers**, written $\\mathbb R$: every point on the number line. Real numbers that are not rational, like $\\sqrt2$ and $\\pi$, are called **irrational**. Their decimals go on forever without repeating.

## Each kind contains the one before

Every natural number is an integer, every integer is rational, and every rational number is real. In symbols, $\\mathbb N \\subset \\mathbb Z \\subset \\mathbb Q \\subset \\mathbb R$. The sign $\\subset$ means "is inside" (a **subset** of). Watch them nest:`,
    },
    { t: 'stage', scene: nestScene() },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why AI cares',
      md: 'Almost every number inside an AI model is a real number: weights, inputs, probabilities. Counting numbers appear too, for how many examples, layers or words. And a computer cannot store most real numbers exactly, because their decimals never end. It keeps a close approximation. Later (How Big Models Are Built → Floating-point numbers) we will see what that costs.',
    },
  ],
}

export const sqrt2: Page = {
  id: 'sqrt2',
  title: 'A number that is not a fraction',
  summary: 'Fractions get as close to √2 as you like, but none is exactly √2. Here is why, proved step by step.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `$\\sqrt 2$ is the number which, multiplied by itself, gives 2. It is about 1.4142. Can we write it as a fraction? Let's try. Each fraction below comes from the one before by a simple rule: from $\\frac pq$, make $\\frac{p + 2q}{p + q}$.`,
    },
    { t: 'stage', scene: sqrt2Scene() },
    {
      t: 'md',
      md: `The squares come out as ${fr
        .slice(0, 5)
        .map((f) => `$\\frac{${f.p * f.p}}{${f.q * f.q}}$`)
        .join(', ')}: always one more or one less than twice the bottom number squared, never exactly 2. Close is not equal. To be sure no fraction works, not just these ones, we need a proof.

## The proof

We use a method called **proof by contradiction**: suppose the opposite, and show it leads to something impossible. Two facts are needed first.

- An **even** number is one that 2 divides exactly: $2k$ for some integer $k$. An **odd** number is $2k + 1$.
- If $p^2$ is even, then $p$ is even. (If $p$ were odd, $p = 2k+1$, then $p^2 = 4k^2 + 4k + 1$, which is odd.)`,
    },
    {
      t: 'derive',
      title: '√2 is not a fraction',
      lines: [
        { tex: '\\sqrt 2 = \\frac pq', why: 'Suppose it is a fraction, already cut down as far as it goes: $p$ and $q$ share no common factor.' },
        { tex: '2 = \\frac{p^2}{q^2}', why: 'Square both sides.' },
        { tex: 'p^2 = 2q^2', why: 'Multiply both sides by $q^2$. So $p^2$ is even.' },
        { tex: 'p = 2k', why: '$p^2$ even means $p$ is even (the fact above), so $p = 2k$ for some integer $k$.' },
        { tex: '4k^2 = 2q^2', why: 'Put $p = 2k$ into line (3).' },
        { tex: 'q^2 = 2k^2', why: 'Divide both sides by 2. So $q^2$ is even, and therefore $q$ is even.' },
        { tex: '2 \\mid p \\text{ and } 2 \\mid q', why: 'Both are even: 2 divides both. But in line (1) they shared no common factor. Impossible.' },
      ],
      result: 'The only thing we supposed was line (1), so line (1) must be false: **$\\sqrt 2$ is not a fraction.** It is irrational.',
    },
    {
      t: 'md',
      md: `## Decimals tell you the kind

A rational number's decimals either stop or repeat a block forever. Divide 1 by 7 and the remainders can only be 1 to 6, so within 6 steps a remainder repeats and the digits start over: $\\frac17 = 0.\\overline{142857}$. An irrational number's decimals never settle into a repeating block. $\\sqrt 2 = 1.41421356\\ldots$ goes on with no pattern.

## Close enough is how computers work

The fraction ${fr[9].p}/${fr[9].q} is within $${sciTex(fr[9].err)}$ of $\\sqrt2$. A computer does something similar: it stores a fraction very close to the real number (one whose bottom is a power of 2) and works with that. For AI this is almost always fine, but not always. Some later lessons show what goes wrong when the small errors add up.`,
    },
  ],
}

export const sets: Page = {
  id: 'sets',
  title: 'Sets: groups of things',
  summary: 'A set is a group of things with no order and no repeats. Union, intersection and difference answer "either", "both" and "only".',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `A **set** is a collection of things, called its **elements** (or members). We list them inside curly brackets. Order does not matter and nothing is counted twice: $\\{2, 3\\}$ and $\\{3, 2, 2\\}$ are the same set.

Take a class of ten students, roll numbers 1 to 10. Let $A$ be the students who passed maths and $B$ the students who passed physics:

$$A = \\{1, 2, 3, 5, 8\\}, \\qquad B = \\{2, 3, 4, 8, 9\\}$$

## Belonging: ∈

$x \\in A$ means "$x$ is an element of $A$". So $5 \\in A$, but $5 \\notin B$ (student 5 did not pass physics). The number of elements is written $|A|$: here $|A| = 5$.

## Inside: ⊂

$A \\subset C$ means every element of $A$ is also in $C$. If $C$ is the whole class, both $A \\subset C$ and $B \\subset C$. The set with no elements at all is the **empty set**, $\\varnothing$.

## Either, both, only

Now three questions about the class. Each one has a set operation.`,
    },
    { t: 'stage', scene: setOpsScene() },
    {
      t: 'md',
      md: `| Question | Operation | Symbol | Here |
|---|---|---|---|
| Who passed **both**? | intersection | $A \\cap B$ | $\\{2, 3, 8\\}$ |
| Who passed **at least one**? | union | $A \\cup B$ | $\\{1, 2, 3, 4, 5, 8, 9\\}$ |
| Who passed **maths but not physics**? | difference | $A \\setminus B$ | $\\{1, 5\\}$ |

## Counting the union

Why is $|A \\cup B|$ not just $|A| + |B| = 10$? Because students 2, 3 and 8 are in both, so adding counts them twice.`,
    },
    {
      t: 'derive',
      title: 'Counting either without counting twice',
      lines: [
        { tex: '|A| + |B|', why: 'Count A, then count B. Everyone in exactly one set is counted once…' },
        { tex: '= |A \\cup B| + |A \\cap B|', why: '…and everyone in both is counted twice: once too many.' },
        { tex: '|A \\cup B| = |A| + |B| - |A \\cap B|', why: 'Move the extra count to the other side.' },
        { tex: '= 5 + 5 - 3 = 7', why: 'Put in this class: 7 students passed at least one subject.' },
      ],
      result: 'This is the rule of **inclusion and exclusion**. In probability it becomes $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$.',
    },
    {
      t: 'md',
      md: `## Writing a set by a rule

Listing works for small sets. For big ones we give a rule instead:

$$\\{x \\in \\mathbb Z : x^2 < 10\\} = \\{-3, -2, -1, 0, 1, 2, 3\\}$$

Read the colon as "such that": "all integers $x$ such that $x^2$ is less than 10". This is how we will write intervals on the next page.`,
    },
  ],
}

export const intervals: Page = {
  id: 'intervals',
  title: 'Intervals: a stretch of the number line',
  summary: 'An interval is every real number between two ends. Square brackets include an end, round ones leave it out.',
  minutes: 6,
  blocks: [
    {
      t: 'md',
      md: `"Any mark from 40 to 100 is a pass." That is not a list: it means every number between 40 and 100, including 40 and 100. A stretch of the number line like this is an **interval**.`,
    },
    { t: 'stage', scene: intervalsScene() },
    {
      t: 'md',
      md: `## The four kinds

| Written | Means | Ends |
|---|---|---|
| $[a, b]$ | $a \\le x \\le b$ | both included (closed) |
| $(a, b)$ | $a < x < b$ | both left out (open) |
| $[a, b)$ | $a \\le x < b$ | left included, right left out |
| $(a, b]$ | $a < x \\le b$ | left left out, right included |

A square bracket hugs its end in; a round bracket keeps it out. The pass marks are $[40, 100]$.

## Intervals that never end

$[2, \\infty)$ means every real number from 2 upwards. The symbol $\\infty$ (**infinity**) is not a number; it says "no end on this side". So it always takes a round bracket. The whole line is $(-\\infty, \\infty) = \\mathbb R$.

## Why an open end matters

Is there a smallest number in $(0, 1]$? You might say "0.0001". But 0.00001 is smaller and still in it, and you can always halve again. An open interval has no smallest (or largest) element at its open end. This sounds like hair-splitting, but you will meet it soon: the **sigmoid** function, which turns any number into a probability, gives answers in $(0, 1)$. It gets as close to 0 and 1 as you like, but never reaches them.`,
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Intervals in AI',
      md: 'A probability lies in $[0, 1]$. A pixel brightness lies in $[0, 255]$, or $[0, 1]$ after dividing by 255. The ReLU function, used in almost every neural network, gives outputs in $[0, \\infty)$. When a later lesson says "the output is in (0, 1)", you now know exactly what it promises.',
    },
  ],
}

export const spaces: Page = {
  id: 'spaces',
  title: 'Lists of numbers: ℝ², ℝ³ and ℝⁿ',
  summary: 'Two numbers make a point in a plane; three make a point in space; n numbers make a point in ℝⁿ. This is how AI sees data.',
  minutes: 5,
  blocks: [
    {
      t: 'md',
      md: `One number is a point on a line. What about a pair of numbers, like one student's marks in maths and physics?`,
    },
    { t: 'stage', scene: spacesScene() },
    {
      t: 'md',
      md: `## Pairs and triples

An **ordered pair** $(x, y)$ is two numbers where order matters: $(72, 85)$ (maths 72, physics 85) is a different student from $(85, 72)$. The set of all pairs of real numbers is written $\\mathbb R^2$ ("R two"). Each pair is one point of a flat plane: go 72 along, then 85 across.

Three numbers $(x, y, z)$ make a point in space, $\\mathbb R^3$.

## n numbers

Nothing stops us at three. A list of $n$ real numbers $(x_1, x_2, \\dots, x_n)$ is an element of $\\mathbb R^n$. The small number under each $x$ is its **index**: $x_1$ is the first, $x_n$ the last. We can't draw more than three directions, but every rule we learn in two or three works the same in $n$.

That 28 × 28 photo from the first page is one point in $\\mathbb R^{784}$. A model that tells cats from dogs is, in the end, a way of splitting that huge space into a "cat" part and a "dog" part. The Machine Learning course draws exactly this, in two dimensions where we can see it.`,
    },
    {
      t: 'readmore',
      items: [
        { book: 'mml', where: 'chapter 2 (Linear Algebra), the opening pages before section 2.1', why: 'how lists of numbers become vectors, the next step after $\\mathbb R^n$.' },
        { book: 'd2l', where: 'section 2.1 (Data Manipulation)', why: 'how lists and grids of numbers are stored and handled in code.' },
      ],
    },
  ],
}

export const check: Page = {
  id: 'check',
  title: 'Check yourself',
  summary: 'Eight questions on kinds of numbers, sets and intervals. Each answer explains itself.',
  minutes: 8,
  blocks: [
    { t: 'md', md: '## Questions\n\nTry each one before you open the answer. If one goes wrong, the explanation says which page to look back at.' },
    { t: 'check', ids: ['fn-smallest-set', 'fn-rational', 'fn-which-rational', 'fn-not-fraction', 'fn-union', 'fn-interval-write', 'fn-open-end', 'fn-count-integers', 'fn-match'], title: 'Check yourself' },
  ],
}
