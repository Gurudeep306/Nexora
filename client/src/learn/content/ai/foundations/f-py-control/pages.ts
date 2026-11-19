import type { Page } from '@/learn/types'
import { doublingRun, loopScene } from './scenes.ts'

const dbl = doublingRun()

export const decisions: Page = {
  id: 'decisions',
  title: 'Decisions: if, elif and else',
  summary: 'Run some lines only when a condition is true. Indentation tells Python which lines belong to the decision.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `So far every line ran, top to bottom. Real programs choose: pass or fail, cat or dog, keep training or stop. \`if\` runs a block of lines only when its condition is \`True\`.`,
    },
    { t: 'python', title: 'if', code: 'marks = 72\nif marks >= 40:\n    print("Passed")\n    print("Well done")\nprint("This line always runs")' },
    {
      t: 'md',
      md: `## Indentation is part of the language

The lines that belong to the \`if\` are **indented**: moved right by 4 spaces. Where the indentation ends, the block ends. Other languages use brackets for this; Python uses the indentation itself, so it must be consistent. The colon \`:\` at the end of the \`if\` line says "a block follows".

Step through the example with marks = 72, then press Edit, change it to 30 and step again: the two indented lines are skipped.

## Two ways: else

\`else\` gives the block to run when the condition is \`False\`. Exactly one of the two blocks runs.`,
    },
    { t: 'python', title: 'if / else', code: 'marks = 31\nif marks >= 40:\n    print("Passed")\nelse:\n    print("Not passed: try again")' },
    {
      t: 'md',
      md: `## Many ways: elif

\`elif\` ("else if") adds more conditions, checked **in order**. The first one that is \`True\` runs, and the rest are skipped. So the order matters: test the strictest condition first.`,
    },
    { t: 'python', title: 'grades with elif', code: 'marks = 83\nif marks >= 90:\n    grade = "A+"\nelif marks >= 80:\n    grade = "A"\nelif marks >= 60:\n    grade = "B"\nelif marks >= 40:\n    grade = "C"\nelse:\n    grade = "F"\nprint(f"{marks} marks: grade {grade}")' },
    {
      t: 'md',
      md: `Step through it: Python tests \`marks >= 90\` (False), then \`marks >= 80\` (True), runs that one line and jumps past the rest.

## A one-line choice

For a choice between two values there is a short form, the **conditional expression**: \`value_if_true if condition else value_if_false\`.`,
    },
    { t: 'python', title: 'conditional expression', code: 'p = 0.83   # a model\'s probability that a photo shows a cat\nlabel = "cat" if p >= 0.5 else "dog"\nprint(label)' },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why AI cares',
      md: 'That last line is how a classifier turns a probability into an answer: choose a **threshold** (here 0.5) and compare. The Machine Learning course shows that the best threshold is often not 0.5, and how to pick it.',
    },
    {
      t: 'md',
      md: `## Indentation errors

Mixing up indentation is the commonest error in a beginner's first week. Python names it clearly:`,
    },
    { t: 'python', title: 'an indentation error, on purpose', code: 'marks = 72\nif marks >= 40:\nprint("Passed")', error: true, step: false },
  ],
}

export const forLoops: Page = {
  id: 'for',
  title: 'for loops and range',
  summary: 'Repeat a block once for every item: every character, every number in a range, every row of data. The loop you will write most.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `A **for loop** runs its block once for each item of a sequence, with a name pointing at the current item. Step through this one and watch \`ch\` change each time round:`,
    },
    { t: 'python', title: 'for over a string', code: 'for ch in "AI":\n    print(ch)\nprint("done")' },
    {
      t: 'md',
      md: `## Counting with range()

\`range(n)\` gives the whole numbers 0, 1, …, n − 1. Like slices, the stop number is **not** included, so \`range(5)\` has exactly 5 numbers. \`range(start, stop)\` and \`range(start, stop, step)\` work like slices too.`,
    },
    { t: 'python', title: 'range', code: 'for i in range(5):\n    print(i, end=" ")\nprint()\nfor i in range(2, 6):\n    print(i, end=" ")\nprint()\nfor i in range(10, 0, -3):\n    print(i, end=" ")\nprint()' },
    {
      t: 'md',
      md: `## Adding up as you go

The most common loop of all keeps a running total: start at 0, add each item. This is the sum $\\sum$ from the maths topic, written as code (Foundations → Sums and products). The marks are in a **list**: several values in square brackets, in order. You met one from \`split()\`; lists get their own lesson soon, and a for loop visits their items one by one.`,
    },
    { t: 'python', title: 'a running total', code: 'marks = [72, 85, 64, 91]\ntotal = 0\nfor m in marks:\n    total = total + m\nprint("total:", total)\nprint("mean:", total / len(marks))' },
    {
      t: 'md',
      md: `Step through it slowly: \`m\` takes each value in turn, and \`total\` grows 0 → 72 → 157 → 221 → 312. Python also has \`sum(marks)\` built in, which does exactly this loop for you; writing the loop once yourself shows what it does.

## A loop inside a loop

The inner loop runs completely for each pass of the outer one. Two loops make a table:`,
    },
    { t: 'python', title: 'nested loops', code: 'for row in range(1, 4):\n    for col in range(1, 4):\n        print(f"{row * col:3}", end="")\n    print()' },
    {
      t: 'md',
      md: `The outer loop runs 3 times and the inner loop runs 3 times on each of those, so the \`print\` inside runs $3 \\times 3 = 9$ times. Nested loops are how you visit every pixel of an image (rows, then columns): 784 times for a 28 × 28 photo.`,
    },
  ],
}

export const whileLoops: Page = {
  id: 'while',
  title: 'while loops',
  summary: 'Repeat while a condition holds, when you don’t know in advance how many times. Watch one go round, and learn how to avoid one that never stops.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `A \`for\` loop knows how many items it will visit. Sometimes you don't: "keep going until the money doubles", "keep training until the loss stops falling". A **while loop** tests its condition before each pass and stops the first time it is \`False\`.`,
    },
    { t: 'stage', scene: loopScene() },
    { t: 'python', title: 'how many years to double?', code: 'balance = 1000\nyears = 0\nwhile balance < 2000:\n    balance = round(balance * 1.1, 2)\n    years += 1\nprint(f"{years} years: Rs {balance}")' },
    {
      t: 'md',
      md: `It takes ${dbl.years} years: ₹1000 × 1.1 eight times is about ₹${dbl.balance.toFixed(0)}. Step through it and watch the line jump from the bottom of the loop back up to the \`while\` test each time.

## The loop that never ends

If nothing inside the loop ever makes the condition \`False\`, it runs forever. Here \`years\` goes up but \`balance\` never changes, so \`balance < 2000\` is always true. Run it: this page stops it after 10 seconds. (In your own Python, press **Ctrl + C** to stop a runaway program.)`,
    },
    { t: 'python', title: 'an endless loop, on purpose', code: 'balance = 1000\nyears = 0\nwhile balance < 2000:\n    years += 1      # the balance never grows: the test never becomes False\nprint(years)', error: true, step: false, note: 'Before writing a while loop, ask: what inside the loop moves it towards the end?' },
  ],
}

export const breaks: Page = {
  id: 'break',
  title: 'break, continue, pass and else on loops',
  summary: 'Leave a loop early, skip one pass, write an empty block, and know whether a loop finished or was stopped.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `## break: leave the loop now

\`break\` stops the loop at once, and the program carries on after it. Use it when you have found what you were looking for.`,
    },
    { t: 'python', title: 'break', code: 'marks = [72, 85, 31, 91, 28]\nfor m in marks:\n    if m < 40:\n        print("first fail:", m)\n        break\n    print("pass:", m)' },
    {
      t: 'md',
      md: `## continue: skip to the next pass

\`continue\` skips the rest of the block for this item only, and the loop moves on.`,
    },
    { t: 'python', title: 'continue', code: 'for m in [72, -1, 85, -1, 64]:\n    if m == -1:          # -1 marks a missing value\n        continue\n    print("mark:", m)' },
    {
      t: 'md',
      md: `Skipping missing values like this is exactly what data cleaning does (pandas does it for whole tables at once, later in this course).

## else on a loop

A loop can have an \`else\` block. It runs only if the loop ended normally, **not** by \`break\`. Read it as "if no break". It answers "did I find it?" without an extra variable.`,
    },
    { t: 'python', title: 'for … else', code: 'roll_numbers = [3, 8, 12, 15]\nwanted = 10\nfor r in roll_numbers:\n    if r == wanted:\n        print("found", wanted)\n        break\nelse:\n    print(wanted, "is not in the list")' },
    {
      t: 'md',
      md: `## pass: a block that does nothing

Python needs at least one line in every block. \`pass\` is a placeholder that does nothing, handy while you are still writing the code.`,
    },
    { t: 'python', title: 'pass', code: 'for i in range(3):\n    pass        # to do: fill this in later\nprint("the loop ran, and did nothing")' },
  ],
}

export const matching: Page = {
  id: 'match',
  title: 'Choosing by shape: match',
  summary: 'match compares one value against several patterns. A tidy alternative to a long chain of elif.',
  minutes: 5,
  blocks: [
    {
      t: 'md',
      md: `When one value decides between many fixed cases, \`match\` (added in Python 3.10) reads more clearly than a chain of \`elif\`. Each \`case\` is a **pattern**; the first one that fits runs. \`_\` fits anything, so it goes last, like \`else\`.`,
    },
    { t: 'python', title: 'match', code: 'command = "train"\nmatch command:\n    case "train":\n        print("Training the model...")\n    case "test" | "evaluate":\n        print("Measuring accuracy...")\n    case _:\n        print("Unknown command:", command)' },
    {
      t: 'md',
      md: `\`|\` means "or": one case can cover several values. Patterns can do much more (pull apart lists, check types), and you will see that once lists and classes are taught. For everyday code, \`if\`/\`elif\` is still the usual choice.`,
    },
    {
      t: 'readmore',
      items: [
        { book: 'python-docs', where: 'The Python Tutorial, chapter 4 (More Control Flow Tools), sections 4.1 to 4.7', why: 'if, for, range, break, continue, else on loops, pass and match, in the official words.' },
        { book: 'python-docs', where: 'The Python Language Reference, chapter 8 (Compound statements)', why: 'the exact rules for every statement on this page.' },
      ],
    },
  ],
}

export const check: Page = {
  id: 'check',
  title: 'Check yourself',
  summary: 'Nine questions: trace the loop, count the passes, find the bug.',
  minutes: 9,
  blocks: [
    { t: 'md', md: '## Questions\n\nTrace each one by hand first, then check it by pasting it into an example and stepping through it.' },
    { t: 'check', ids: ['fc-elif', 'fc-range', 'fc-range-len', 'fc-total', 'fc-nested', 'fc-while', 'fc-break', 'fc-else', 'fc-infinite'], title: 'Check yourself' },
  ],
}
