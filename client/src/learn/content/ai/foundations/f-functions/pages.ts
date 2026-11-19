import type { Page } from '@/learn/types'
import { fare, inverseScene, machineScene, moveScene, shapesScene, surfaceScene, traceScene } from './scenes.ts'

export const rule: Page = {
  id: 'rule',
  title: 'A function is a rule',
  summary: 'A function takes a number in and gives exactly one number out. That one idea is the heart of every AI model.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `Suppose a taxi charges ₹50 to start and ₹15 for every kilometre. The fare depends on the distance: tell me how far you went and I can tell you the price. A rule like this, which turns one number into another, is a **function**.`,
    },
    { t: 'stage', scene: machineScene() },
    {
      t: 'md',
      md: `## Writing a function

We give the rule a name, usually $f$, and write the input in brackets:

$$f(x) = 50 + 15x$$

Read it as "$f$ of $x$ equals 50 plus 15 times $x$". The letter $x$ stands for whatever we put in. To use the rule, replace $x$ by the input: $f(5) = 50 + 15 \\times 5 = ${fare(5)}$. A 5 km ride costs ₹${fare(5)}.

## Exactly one output

The one thing a function must do: **every input gives exactly one output**. The taxi rule never gives two different fares for the same distance. A rule like "the number whose square is $x$" is not a function, because 4 has two square roots, 2 and −2. (That is why $\\sqrt x$ means only the positive one: choosing one makes it a function.)

## Where inputs come from, where outputs go

- The **domain** is the set of inputs the function accepts. For the taxi, distances: $[0, \\infty)$. A negative distance makes no sense.
- The **codomain** is the set the outputs belong to, here $\\mathbb R$.
- The **range** is the set of outputs it actually produces. The fare is never below ₹50, so the range is $[50, \\infty)$.

All of this is written in one line:

$$f : [0, \\infty) \\to \\mathbb R, \\qquad f(x) = 50 + 15x$$

"$f$ takes numbers from $[0, \\infty)$ to $\\mathbb R$." The arrow shows the direction: from inputs to outputs.`,
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why AI cares',
      md: 'An AI model **is** a function. It takes numbers in (the 784 pixels of a photo) and gives numbers out (how likely "cat" is). Training means adjusting the rule until its outputs are right. Every course after this one is about which rules work, and how to adjust them.',
    },
  ],
}

export const graph: Page = {
  id: 'graph',
  title: 'Drawing a function: its graph',
  summary: 'Each input and its output make a point. All the points together are the graph, and the graph shows the whole function at a glance.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `A table shows a few inputs and outputs. A **graph** shows all of them. Take the function $f(x) = x^2$: square the input.`,
    },
    { t: 'stage', scene: traceScene() },
    {
      t: 'md',
      md: `## From pairs to points

Each input $x$ and its output $f(x)$ make a pair $(x, f(x))$, and a pair is a point in the plane (Numbers, sets and intervals → Lists of numbers). The **graph** of $f$ is the set of all these points:

$$\\text{graph of } f = \\{(x, f(x)) : x \\text{ in the domain}\\}$$

## Reading a graph

To find $f(1.5)$, go to 1.5 on the $x$ axis, go straight up until you hit the curve, then across to the $y$ axis: 2.25. The graph also shows things a table hides:

- **Where it is smallest**: $x^2$ is lowest at $x = 0$.
- **Symmetry**: the left half mirrors the right, because $(-x)^2 = x^2$.
- **How fast it grows**: the curve gets steeper as you move out. Going from 1 to 2 adds 3 to the output; going from 2 to 3 adds 5.

## The vertical line test

Because every input has exactly one output, a vertical line (one $x$) can cross the graph of a function at most once. A circle fails this test: the vertical line $x = 0$ crosses it twice. So a circle is not the graph of a function of $x$.`,
    },
  ],
}

export const shapes: Page = {
  id: 'shapes',
  title: 'Shapes you will meet again',
  summary: 'Straight lines, parabolas, absolute value and ReLU. Each one comes back later, so here is what to notice about each.',
  minutes: 7,
  blocks: [
    { t: 'md', md: 'A few graphs appear again and again in AI. Meet them now, one at a time.' },
    { t: 'stage', scene: shapesScene() },
    {
      t: 'md',
      md: `## Straight lines: $f(x) = mx + c$

The taxi fare is a straight line. Two numbers decide it:

- the **slope** $m$: how much the output changes when the input grows by 1 (₹15 per km);
- the **intercept** $c$: the output when the input is 0, where the line crosses the $y$ axis (₹50).

A function whose graph is a straight line is called **linear**. The simplest AI model, linear regression (Machine Learning course), is exactly this: find the best $m$ and $c$ for some data.

## Parabolas: $f(x) = ax^2 + bx + c$

A **quadratic** function has an $x^2$ in it. Its graph is a U, called a parabola: it comes down, turns at one lowest point, and goes up again (or the other way up if $a$ is negative). The lowest point matters: much of AI is finding the lowest point of some curve, and a parabola is the simplest curve that has one.

## Absolute value: $f(x) = |x|$

$|x|$ is the distance of $x$ from 0: $|3| = 3$ and $|-3| = 3$. Its graph is a V with a sharp corner at 0. Unlike the parabola, it has no smooth bottom. That corner will matter when we talk about slopes.

## ReLU: $f(x) = \\max(0, x)$

$\\max(0, x)$ means "the larger of 0 and $x$": negative inputs become 0; positive inputs pass through unchanged. Its name, **ReLU**, stands for *rectified linear unit*. It looks almost too simple to be useful, yet it sits between the layers of almost every modern neural network. The Deep Learning course shows why such a simple bend is enough.`,
    },
  ],
}

export const moving: Page = {
  id: 'moving',
  title: 'Moving and stretching a graph',
  summary: 'Small changes to a formula move, stretch and flip its graph in predictable ways. One of them moves the opposite way to what you expect.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `What happens to a graph when we change its formula a little? Start with $x^2$ and change one thing at a time.`,
    },
    { t: 'stage', scene: moveScene() },
    {
      t: 'md',
      md: `## Why $x - 2$ moves the graph right

This one surprises everyone. Look at $g(x) = (x - 2)^2$ in a table next to $f(x) = x^2$:

| $x$ | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| $f(x) = x^2$ | 0 | 1 | 4 | 9 | 16 |
| $g(x) = (x-2)^2$ | 4 | 1 | 0 | 1 | 4 |

$f$ reaches 0 at $x = 0$. $g$ reaches 0 only when $x - 2 = 0$, that is at $x = 2$. Whatever $f$ did at some input, $g$ does 2 later. So $g$ is $f$ moved 2 to the **right**.

## The four moves

| Change | Effect on the graph |
|---|---|
| $f(x - h)$ | moves right by $h$ |
| $f(x) + k$ | moves up by $k$ |
| $a\\,f(x)$ with $a > 1$ | stretches up (narrower U) |
| $a\\,f(x)$ with $0 < a < 1$ | squashes down (wider U) |
| $-f(x)$ | flips upside down |

Together: $g(x) = a(x - h)^2 + k$ is a parabola with its turning point at $(h, k)$. In the animation, $a = -\\tfrac12$, $h = 2$, $k = 1$: the turning point is at $(2, 1)$, and it is now a highest point.`,
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why AI cares',
      md: 'The numbers $a$, $h$ and $k$ are **parameters**: they choose one curve out of a whole family. An AI model is a function with parameters (often billions of them), and "learning" means choosing their values. Here you can see what changing a parameter does; later, an algorithm will choose them for us.',
    },
  ],
}

export const inverse: Page = {
  id: 'inverse',
  title: 'Functions in a row, and undoing them',
  summary: 'Feeding one function into another is composition. Undoing a function is its inverse, and its graph is a mirror image.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `## One function after another

Functions can be chained: the output of one becomes the input of the next. Say a fare $f(x) = 50 + 15x$ then has a 5% tax added: $g(y) = 1.05y$. The total for $x$ km is $g(f(x))$, read "$g$ of $f$ of $x$". This is called **composition**, also written $(g \\circ f)(x)$.

For 4 km: $f(4) = ${fare(4)}$, then $g(${fare(4)}) = ${Math.round(1.05 * fare(4) * 100) / 100}$.

**Order matters.** Here is a pair where the order changes the answer: $u(x) = x + 1$ and $v(x) = x^2$. Then $v(u(3)) = (3 + 1)^2 = 16$, but $u(v(3)) = 3^2 + 1 = 10$. A neural network is a long chain of compositions, one layer after another, and the order of the layers matters in the same way.

## Undoing a function

The fare was ₹125. How far did you go? We need to run the rule backwards. A function that undoes $f$ is its **inverse**, written $f^{-1}$ (this is a name, not "1 divided by $f$"). Let's find the inverse of $f(x) = 2x + 3$.`,
    },
    {
      t: 'derive',
      title: 'Finding the inverse of 2x + 3',
      lines: [
        { tex: 'y = 2x + 3', why: 'Call the output $y$. We want $x$ in terms of $y$.' },
        { tex: 'y - 3 = 2x', why: 'Take 3 from both sides.' },
        { tex: 'x = \\frac{y - 3}{2}', why: 'Divide both sides by 2.' },
        { tex: 'f^{-1}(x) = \\frac{x - 3}{2}', why: 'Rename the input $x$ again, as we usually do.' },
        { tex: 'f^{-1}(f(4)) = f^{-1}(11) = \\frac{11 - 3}{2} = 4', why: 'Check: going there and back returns 4.' },
      ],
      result: 'An inverse undoes the function: $f^{-1}(f(x)) = x$ for every $x$ in the domain.',
    },
    { t: 'stage', scene: inverseScene() },
    {
      t: 'md',
      md: `## Why the graph is a mirror image

A point $(a, b)$ on the graph of $f$ means $f(a) = b$. Then $f^{-1}(b) = a$, so $(b, a)$ is on the graph of $f^{-1}$. Swapping the two numbers of every point is exactly a reflection in the line $y = x$.

## Not every function can be undone

$x^2$ sends both 3 and −3 to 9. Given 9, which did it come from? We can't tell, so $x^2$ on all of $\\mathbb R$ has no inverse. Restrict its domain to $[0, \\infty)$ and it does: $\\sqrt x$. The next topic uses this idea for the most important pair in this course: the exponential and its inverse, the logarithm.`,
    },
  ],
}

export const many: Page = {
  id: 'many',
  title: 'Functions of two numbers',
  summary: 'When a function takes two inputs, its graph is a surface. This is the picture behind training every AI model.',
  minutes: 6,
  blocks: [
    {
      t: 'md',
      md: `So far each function took one number. Many depend on more: the area of a rectangle depends on its width and its height, $A(w, h) = wh$. A function can take two inputs (or a hundred, or a million) and still give one output.

What does its graph look like? With one input, the graph lived in a plane: input along, output up. With two inputs, the inputs already fill a plane (the floor), so the output needs a third direction: up. The graph becomes a **surface**.`,
    },
    { t: 'stage', scene: surfaceScene() },
    {
      t: 'md',
      md: `## Reading a surface

Each point $(x, y)$ on the floor rises to height $f(x, y)$. For the bowl $f(x, y) = \\frac{x^2 + y^2}{2}$, the height grows with distance from the centre, the same in every direction. Seen from above, the heights become a map: rings of equal height, like the contour lines on a hill map.

We write such a function as $f : \\mathbb R^2 \\to \\mathbb R$: pairs in, one number out.

## The picture behind training

A model's **error** depends on its parameters. With two parameters, the error is a surface over the plane of parameter values, and training means walking downhill to its lowest point. Real models have millions of parameters, so their error lives over a space we can't draw. The pictures we can draw, like this bowl, are how we understand what happens there.`,
    },
    {
      t: 'readmore',
      items: [
        { book: 'mml', where: 'chapter 5 (Vector Calculus), its opening pages', why: 'functions with many inputs, the language of the whole Math for AI course.' },
        { book: 'udl', where: 'chapter 2 (Supervised learning)', why: 'a model as a function with parameters, and its loss as a surface over them.' },
      ],
    },
  ],
}

export const check: Page = {
  id: 'check',
  title: 'Check yourself',
  summary: 'Nine questions on functions, graphs, moving graphs, composition and inverses.',
  minutes: 9,
  blocks: [
    { t: 'md', md: '## Questions\n\nTry each one before you open the answer. If one goes wrong, the explanation says which page to look back at.' },
    { t: 'check', ids: ['ff-eval', 'ff-not-function', 'ff-range', 'ff-read-graph', 'ff-relu', 'ff-shift', 'ff-compose', 'ff-inverse', 'ff-surface'], title: 'Check yourself' },
  ],
}
