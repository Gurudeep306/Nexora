import type { Page } from '@/learn/types'
import { namesScene } from './scenes.ts'

export const why: Page = {
  id: 'why',
  title: 'Why Python, and your first line of code',
  summary: 'Python is the language almost all AI is written in. You will run real Python on this page, right now, without installing anything.',
  minutes: 6,
  blocks: [
    {
      t: 'md',
      md: `In the last chapter we wrote functions with pen and paper: $f(x) = 50 + 15x$. To get a computer to work them out for us, we need a language it understands. For AI, that language is **Python**.

Python was first released in 1991. It reads almost like English, so it is a good first language. It also has free libraries that do the heavy maths for you: **NumPy** for arrays of numbers, **pandas** for tables, **Matplotlib** for plots, **scikit-learn** for classic machine learning and **PyTorch** for neural networks. You will learn all of them in this course, in that order.

## Your first program

A program is a list of instructions the computer carries out one after another, top to bottom. Here is the shortest useful one. Press **Run**:`,
    },
    { t: 'python', title: 'hello.py', code: 'print("Hello, NexoraGuru!")' },
    {
      t: 'md',
      md: `\`print\` is a **function** (just like $f$ in the last chapter): you give it something in the brackets, and it shows it in the output. The words in quotes are **text**; the quotes tell Python where the text starts and ends.

Now press **Edit**, change the words, and press **Run** again. You have just written your own program.

## How Python runs on this page

When you press Run the first time, your browser downloads Python itself (about 10 MB, once) and runs your code on your own device. Nothing is sent to a server. The output shown before you press Run is a recording of the same code run on Python ${'3.15'}, the latest version.`,
    },
    {
      t: 'callout',
      kind: 'note',
      title: 'Which Python?',
      md: 'This course follows the official documentation for **Python 3.15**, the newest release. The Python inside your browser (Pyodide) is one version behind, 3.14, which runs every example on these pages the same way. When a later lesson uses something new in 3.15, it says so. To install Python on your own computer, use the official site, python.org; the lesson "Modules, packages, pip, virtual environments and notebooks" walks you through it.',
    },
    {
      t: 'md',
      md: `## Many lines, in order

Python runs line 1, then line 2, then line 3. Press **Step through** to watch it happen one line at a time:`,
    },
    { t: 'python', title: 'three lines', code: 'print("Line one runs first")\nprint("then line two")\nprint("then line three")' },
    {
      t: 'md',
      md: `## Comments

Anything after a \`#\` on a line is a **comment**: a note for people. Python ignores it.`,
    },
    { t: 'python', title: 'comments', code: '# This whole line is a note for the reader.\nprint("Comments are not run")  # and this part is ignored too' },
  ],
}

export const values: Page = {
  id: 'values',
  title: 'Python as a calculator: numbers and arithmetic',
  summary: 'Whole numbers, decimal numbers, the seven arithmetic operators, the order they run in, and one surprise about decimals.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `The simplest thing Python does is arithmetic. \`print\` shows the result of each sum:`,
    },
    { t: 'python', title: 'arithmetic', code: 'print(7 + 3)\nprint(7 - 3)\nprint(7 * 3)\nprint(7 / 2)' },
    {
      t: 'md',
      md: `\`*\` means multiply (there is no × key). Notice that $7 / 2$ printed \`3.5\`: division always gives a decimal number, even $8 / 4$ gives \`2.0\`.

## Two kinds of number: int and float

- An **int** (integer) is a whole number: \`7\`, \`-3\`, \`0\`. These are the integers $\\mathbb Z$ from Numbers, sets and intervals.
- A **float** (floating-point number) is a number with a decimal point: \`3.5\`, \`2.0\`, \`-0.25\`. Floats are how a computer stores real numbers, approximately.

## Whole-number division, remainders and powers`,
    },
    { t: 'python', title: 'floor division, remainder, power', code: '# 17 sweets shared between 5 children\nprint(17 // 5)   # each child gets 3 (floor division)\nprint(17 % 5)    # 2 are left over (the remainder)\nprint(5 * 3 + 2) # check: 3 each for 5 children, plus 2 left = 17\nprint(2 ** 10)   # 2 to the power 10' },
    {
      t: 'md',
      md: `| Operator | Meaning | Example | Result |
|---|---|---|---|
| \`+\` | add | \`7 + 3\` | \`10\` |
| \`-\` | subtract | \`7 - 3\` | \`4\` |
| \`*\` | multiply | \`7 * 3\` | \`21\` |
| \`/\` | divide (always a float) | \`7 / 2\` | \`3.5\` |
| \`//\` | floor division (round down to a whole number) | \`17 // 5\` | \`3\` |
| \`%\` | remainder | \`17 % 5\` | \`2\` |
| \`**\` | power | \`2 ** 10\` | \`1024\` |

## Which part is worked out first

Python follows the same order as school maths: brackets first, then powers, then \`*\` \`/\` \`//\` \`%\`, then \`+\` and \`-\`. Operators of the same level go left to right. When in doubt, add brackets: they never hurt.`,
    },
    { t: 'python', title: 'order of operations', code: 'print(2 + 3 * 4)     # * first: 2 + 12\nprint((2 + 3) * 4)   # brackets first: 5 * 4\nprint(2 ** 3 ** 2)   # powers go right to left: 2 ** 9\nprint(-3 ** 2)       # the power happens before the minus: -(3 ** 2)' },
    {
      t: 'md',
      md: `The last two lines surprise most people. \`**\` is the one operator that groups from the right, and it binds tighter than a minus sign in front. Write \`(-3) ** 2\` if you mean "minus three, squared".

## The decimal surprise`,
    },
    { t: 'python', title: '0.1 + 0.2', code: 'print(0.1 + 0.2)\nprint(0.1 + 0.2 == 0.3)\nprint(round(0.1 + 0.2, 2))' },
    {
      t: 'md',
      md: `$0.1 + 0.2$ is not exactly $0.3$ in a computer. Remember $\\sqrt 2$ from the first topic: a computer stores the nearest fraction whose bottom is a power of 2, and $0.1$ is not exactly such a fraction, so a tiny error creeps in. This is not a Python bug; every language does the same. Two lessons for life:

- never test floats for being exactly equal; check that they are close (the \`math.isclose\` function, which you'll meet with modules);
- round only when you show a result to a person, with \`round(value, digits)\`.

The official tutorial has a whole appendix on this: *Floating-Point Arithmetic: Issues and Limitations*.`,
    },
  ],
}

export const variables: Page = {
  id: 'variables',
  title: 'Variables: names for values',
  summary: 'A variable is a name that points at a value. Watch exactly what happens when you assign, reuse and reassign one.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `Typing the same number again and again is slow and error-prone. Instead, give it a name. The \`=\` sign **assigns** a value to a name:`,
    },
    { t: 'python', title: 'a taxi fare, with names', code: 'start = 50\nper_km = 15\nkm = 8\nfare = start + per_km * km\nprint(fare)' },
    {
      t: 'md',
      md: `Press **Step through**. At each step you can see which line runs next and every variable that exists so far, with its type and value. That table is what Python itself keeps track of.

## = is not "equals"

In maths, $x = 5$ states a fact. In Python, \`x = 5\` is an **instruction**: work out the right side, then point the name on the left at the result. That is why this line makes sense in Python but not in maths:`,
    },
    { t: 'python', title: 'counting up', code: 'visits = 0\nvisits = visits + 1\nvisits = visits + 1\nprint(visits)' },
    {
      t: 'md',
      md: `Read \`visits = visits + 1\` as "take the current value of visits, add 1, and make visits point at the result". Step through it and watch the value climb.

## What a variable really is

A variable is not a box with a number inside. It is a **name** that points at a value. The difference matters as soon as two names share one value:`,
    },
    { t: 'stage', scene: namesScene() },
    { t: 'python', title: 'two names, one value', code: 'marks = 72\nbest = marks\nmarks = 85\nprint("marks:", marks)\nprint("best:", best)' },
    {
      t: 'md',
      md: `\`best\` is still 72. Moving the name \`marks\` to 85 did nothing to \`best\`. With numbers this is what you'd expect. With lists, which can be changed in place, the same picture explains a famous surprise (Lists and tuples, later in this course).

## Shortcuts you will see everywhere`,
    },
    { t: 'python', title: 'augmented assignment and swapping', code: 'score = 10\nscore += 5      # the same as score = score + 5\nscore *= 2      # the same as score = score * 2\nprint(score)\n\na, b = 1, 2     # two names at once\na, b = b, a     # swap them, in one line\nprint(a, b)' },
    {
      t: 'md',
      md: `## Naming rules

A name is letters, digits and underscores, and must not start with a digit: \`per_km\`, \`total2\`, \`_hidden\` are fine; \`2nd\` and \`per-km\` are not. Case matters: \`Fare\` and \`fare\` are different names. The convention in Python is **lower case with underscores** (\`learning_rate\`, not \`LearningRate\`). A few words are reserved because they mean something to Python: \`if\`, \`for\`, \`class\`, \`True\`, and so on.

## Using a name before it exists

Python reads top to bottom, so a name must be assigned before it is used. This example fails on purpose. Run it and read the error: Python names the line and the problem.`,
    },
    { t: 'python', title: 'an error, on purpose', code: 'price = 120\nprint(price * quantity)', error: true },
    {
      t: 'md',
      md: `\`NameError: name 'quantity' is not defined\` means exactly what it says. Error messages are your friends: read the last line first, then the line number. Fix it by adding \`quantity = 3\` above the print, and run it again.`,
    },
  ],
}

export const types: Page = {
  id: 'types',
  title: 'Types: int, float, str, bool and None',
  summary: 'Every value has a type, and the type decides what you can do with it. How to see a type, and how to change one.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `Every value in Python has a **type**. The built-in function \`type\` tells you which:`,
    },
    { t: 'python', title: 'type()', code: 'print(type(42))\nprint(type(3.5))\nprint(type("cat"))\nprint(type(True))\nprint(type(None))' },
    {
      t: 'md',
      md: `| Type | What it holds | Examples |
|---|---|---|
| \`int\` | whole numbers, as big as you like | \`42\`, \`-7\`, \`10**30\` |
| \`float\` | decimal numbers (approximate) | \`3.5\`, \`0.1\`, \`1e-8\` |
| \`str\` | text (a **string** of characters) | \`"cat"\`, \`'roll no. 17'\` |
| \`bool\` | true or false | \`True\`, \`False\` |
| \`NoneType\` | "no value here" | \`None\` |

\`1e-8\` is how Python writes $1 \\times 10^{-8}$, the same scientific notation we used for tiny numbers in the first topic.

## The type decides what an operator does`,
    },
    { t: 'python', title: 'the same + on different types', code: 'print(2 + 3)          # numbers: add\nprint("2" + "3")      # strings: join\nprint("ha" * 3)       # a string times an int: repeat\nprint(2 + 3.0)        # int and float: the int becomes a float' },
    {
      t: 'md',
      md: `\`"2" + "3"\` is \`"23"\`, not 5: they are text, not numbers. Mixing a number and text with \`+\` is an error, because Python will not guess which you meant:`,
    },
    { t: 'python', title: 'an error, on purpose', code: 'age = 19\nprint("Age: " + age)', error: true },
    {
      t: 'md',
      md: `## Changing a type

To turn one type into another, call the type's name like a function. This is called **conversion** (or casting). It is how you turn the text a user typed, or a value read from a file, into a number you can calculate with.`,
    },
    { t: 'python', title: 'conversions', code: 'print(int("42") + 1)     # text to whole number\nprint(float("2.5") * 2)  # text to decimal\nprint(str(19) + " years") # number to text\nprint(int(3.99))         # float to int cuts off the decimals (it does not round)\nprint(round(3.99))       # round() rounds' },
    { t: 'python', title: 'a conversion that fails', code: 'print(int("4.5"))', error: true },
    {
      t: 'md',
      md: `\`int("4.5")\` fails: the text is not a whole number. \`int(float("4.5"))\` works, in two steps. A **ValueError** means "right type, wrong value".

## True and False: bool

A **bool** is either \`True\` or \`False\` (capital first letter). Comparisons produce them, and \`if\` (next lesson but one) uses them to decide what to do. Any value can be turned into a bool: zero, empty text and \`None\` count as \`False\`; everything else counts as \`True\`.`,
    },
    { t: 'python', title: 'what counts as True', code: 'print(bool(0), bool(7))\nprint(bool(""), bool("no"))\nprint(bool(None))\nprint(True + True)   # True behaves like 1 in arithmetic' },
    {
      t: 'md',
      md: `## None: no value yet

\`None\` means "nothing here". A function that does not give anything back returns \`None\`, and it is a good starting value for "not known yet". Test for it with \`is\`: \`x is None\`.

## Checking a type in code

\`isinstance(value, type)\` answers "is this value of this type?" with a bool. You will use it to write functions that check what they were given.`,
    },
    { t: 'python', title: 'isinstance()', code: 'x = 3.0\nprint(isinstance(x, float))\nprint(isinstance(x, int))\nprint(isinstance(x, (int, float)))  # either one' },
  ],
}

export const compare: Page = {
  id: 'compare',
  title: 'Comparisons and logic',
  summary: 'Asking questions about values: equal, bigger, smaller, and combining answers with and, or, not. Python can even write intervals.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `A **comparison** asks a question and answers with a bool:`,
    },
    { t: 'python', title: 'comparisons', code: 'marks = 72\nprint(marks == 72)   # equal?\nprint(marks != 72)   # not equal?\nprint(marks > 40)    # greater than?\nprint(marks <= 35)   # at most?' },
    {
      t: 'md',
      md: `Notice the double equals: \`=\` assigns, \`==\` asks. Mixing them up is the most common beginner bug, and Python will usually stop you with an error.

| Operator | Question |
|---|---|
| \`==\` | equal? |
| \`!=\` | not equal? |
| \`<\`, \`<=\` | less than? at most? |
| \`>\`, \`>=\` | greater than? at least? |

## Python can write an interval

In the first topic we wrote the pass marks as the interval $[40, 100]$, meaning $40 \\le x \\le 100$. Python lets you write exactly that, a **chained comparison**:`,
    },
    { t: 'python', title: 'chained comparison = an interval', code: 'marks = 72\nprint(40 <= marks <= 100)   # is marks in [40, 100]?\np = 1.0\nprint(0 < p < 1)            # is p in the open interval (0, 1)?' },
    {
      t: 'md',
      md: `## Combining answers: and, or, not

- \`a and b\` is \`True\` only when both are.
- \`a or b\` is \`True\` when at least one is.
- \`not a\` flips it.

These are the set operations from the first topic in another form: \`and\` is the intersection (both), \`or\` is the union (either).`,
    },
    { t: 'python', title: 'and, or, not', code: 'maths = 72\nphysics = 31\npassed_maths = maths >= 40\npassed_physics = physics >= 40\nprint("both:", passed_maths and passed_physics)\nprint("at least one:", passed_maths or passed_physics)\nprint("failed maths:", not passed_maths)' },
    {
      t: 'md',
      md: `## Python stops as soon as it knows

\`and\` and \`or\` look at the right-hand side only if they need to. In \`False and anything\`, the answer is already \`False\`, so \`anything\` is never worked out. This is called **short-circuiting**, and it lets you write safe checks like \`count > 0 and total / count > 50\`: the division is skipped when \`count\` is 0.`,
    },
    { t: 'python', title: 'short-circuit keeps you safe', code: 'count = 0\ntotal = 0\nprint(count > 0 and total / count > 50)   # no ZeroDivisionError: the division never runs' },
    {
      t: 'readmore',
      items: [
        { book: 'python-docs', where: 'The Python Tutorial, chapter 3 (An Informal Introduction to Python)', why: 'numbers, text and first steps, in the official words.' },
        { book: 'python-docs', where: 'The Python Standard Library, Built-in Types (Truth Value Testing; Boolean Operations; Comparisons; Numeric Types)', why: 'the exact rules for every operator on this page.' },
        { book: 'python-docs', where: 'The Python Tutorial, chapter 15 (Floating-Point Arithmetic: Issues and Limitations)', why: 'why 0.1 + 0.2 is not 0.3, in full.' },
      ],
    },
  ],
}

export const check: Page = {
  id: 'check',
  title: 'Check yourself',
  summary: 'Nine questions: predict the output, spot the error, choose the type.',
  minutes: 9,
  blocks: [
    { t: 'md', md: '## Questions\n\nPredict each answer first, then check it. You can paste any of these into an example above, press Edit, and run it.' },
    { t: 'check', ids: ['fp-floor', 'fp-power', 'fp-float', 'fp-names', 'fp-plus', 'fp-int', 'fp-bool', 'fp-chain', 'fp-error'], title: 'Check yourself' },
  ],
}
