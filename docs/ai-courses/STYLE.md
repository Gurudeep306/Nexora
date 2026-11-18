# How we explain: every lesson is a story

The owner's bar: **anyone can understand it.** A student who follows the
courses in order, starting with school maths, never meets a sentence they
can't follow. Every agent writes in this voice. Read with
[AGENT_RULES.md](AGENT_RULES.md).

## 1. A story, not a list of facts

Each course has a story (in `curriculum.json`, `story`), and each topic is
one chapter of it. A good lesson reads like this:

1. **A problem, with real stakes.** Someone needed something and couldn't do
   it. ("In 1986 people could build networks with many layers, but nobody
   knew how to train the middle ones.")
2. **The obvious attempt, and why it fails.** Show it failing, with numbers.
   ("Nudge each weight and re-run the network: 10,000 weights means 10,000
   runs for one step.")
3. **The key idea, in one sentence.** ("Work backwards, and reuse what you
   computed on the way.")
4. **Watch it work** on the smallest case, every number shown.
5. **Now the full math**, derived step by step, each step with its reason.
6. **What it unlocked**, and the next problem it left open, which is the
   next topic's opening. Every lesson ends with a question the next one
   answers.

The history is part of the story: who had the problem, which paper solved it,
what came next. That is where the papers live.

## 2. Plain words first, symbols second

- Say it in words, then show it with numbers, then write the symbols. Never
  the other way round.
- One new word at a time. Define it the first time, in bold, in plain
  language, and link it in the course web (`web.json`) so it can be looked up
  later from any lesson.
- Short sentences. Active voice. "You" for the student, "we" for us working
  it out together.
- Analogies are welcome when they are exact enough: say where the analogy
  stops being true. Everyday examples Indian students know (cricket scores,
  train timetables, UPI payments, exam marks) are better than abstract ones.
- No "obviously", "trivially", "simply", "it is easy to see". If it were
  obvious, we wouldn't need to say it.

## 3. Code is told as a story too

Code is never dumped. It is built up in front of the student:

1. **Version 1: the simplest thing that works**, a few lines, on the tiny
   example. Run it and look at the output.
2. **Show its limit** ("it takes 3 seconds for 10 points; for a million it
   would take a day").
3. **Version 2 fixes one thing** (vectorise, batch, stabilise). Only the
   changed lines are shown, highlighted, with one sentence saying why.
4. Repeat until it is the real version. The final code is then shown whole.

Every line of code that matters is tied to its line of math ("this line is
equation (4)"); hovering one highlights the other (linked symbols,
PIPELINE.md 4.4). Variable names match the notation (`W1`, `b1`, `z1`, `a1`,
`dz1`).

## 4. Use the web: no student stays stuck

- At the start of each topic: **"What you need"**, with links to each
  prerequisite and a 3-question warm-up. If they get one wrong, link straight
  to where it is taught.
- Every time an earlier idea is used, link it ("we use the chain rule
  (Math for AI → The chain rule) here").
- **"Stuck?" box** at the end of each page: the prerequisite chain for this
  page (from `web.json` `allNeeds`), nearest first.
- **"Where this goes next"** at the end of each topic: `usedBy` and `related`
  topics in any course, and the models that use it (from `models.json`), so
  the student sees why it matters.

## 5. Use the books (never copy them)

Each course lists books to read alongside (`reading` in `curriculum.json`).
An agent writing a topic reads the matching chapters first, and compares
explanations. Our job is to explain it **better and more visually**, in our
own words and drawings, with our own examples. A "Read more" note at the end
of each topic names the book and chapter (checked by the reviewer).

## 6. A sample of the voice

> You have a network with two weights, and its loss is 0.84. You want it
> lower. Which way should each weight move, and by how much?
>
> Try the honest way first: change $w_1$ by a tiny amount, 0.001, and run
> the network again. The loss becomes 0.8387. So the loss drops by about
> 0.0013 for every 0.001 we add: the slope is about −1.3. Good, so we should
> increase $w_1$. Now do the same for $w_2$…
>
> This works. But a real network has a million weights, so one step would
> need a million runs. In 1986, Rumelhart, Hinton and Williams showed that
> one run forwards and one run backwards are enough. Here is how.
