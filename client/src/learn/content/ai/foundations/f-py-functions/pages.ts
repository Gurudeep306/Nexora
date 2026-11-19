import type { Page } from '@/learn/types'
import { FRAMES_CODE, framesScene } from './scenes.ts'

export const define: Page = {
  id: 'def',
  title: 'Defining and calling a function',
  summary: 'Give a block of code a name with def, run it whenever you like, and get a value back with return.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `In Functions and their graphs we wrote $f(x) = 50 + 15x$: a rule with a name. Python lets you write your own rules the same way, with \`def\` (short for *define*):`,
    },
    { t: 'python', title: 'def and return', code: 'def fare(km):\n    return 50 + 15 * km\n\nprint(fare(5))\nprint(fare(12))' },
    {
      t: 'md',
      md: `- \`def fare(km):\` names the function \`fare\` and its **parameter** \`km\`, the input.
- The indented lines are the **body**: what the function does.
- \`return\` ends the function and hands a value back to whoever called it.
- \`fare(5)\` **calls** it: \`km\` becomes 5, the body runs, and the call is replaced by what came back.

Step through it: the run jumps into the body at each call and comes back out with the answer.

## Why write functions?

Write the rule once, use it a hundred times. Fix a mistake in one place. Give a piece of work a clear name. An AI model is built from functions inside functions: a layer is a function, the loss is a function, the training step is a function.

## return is not print

\`print\` shows a value on the screen. \`return\` gives the value back to your program, so you can keep calculating with it. A function with no \`return\` gives back \`None\`.`,
    },
    { t: 'python', title: 'return vs print', code: 'def shows(km):\n    print(50 + 15 * km)     # shows it, gives back nothing\n\ndef gives(km):\n    return 50 + 15 * km     # gives it back\n\nx = shows(2)\ny = gives(2)\nprint("x is", x)\nprint("y is", y)\nprint("y + 10 is", y + 10)' },
    {
      t: 'md',
      md: `\`shows(2)\` printed 80, but \`x\` is \`None\`, so \`x + 10\` would be an error. Most functions should **return** their result and leave printing to the caller.`,
    },
  ],
}

export const args: Page = {
  id: 'args',
  title: 'Arguments: positional, keyword and default',
  summary: 'Pass inputs by position or by name, give parameters default values, and accept any number of arguments.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `A function can take several inputs. The values you pass in a call are its **arguments**.`,
    },
    { t: 'python', title: 'several parameters', code: 'def fare(km, start, per_km):\n    return start + per_km * km\n\nprint(fare(5, 50, 15))                # by position: km=5, start=50, per_km=15\nprint(fare(km=5, per_km=15, start=50))  # by name, in any order' },
    {
      t: 'md',
      md: `Arguments passed **by position** are matched left to right. Arguments passed **by keyword** (\`name=value\`) are matched by name, so their order doesn't matter, and the call explains itself. Library functions you'll use constantly, like \`plt.plot(x, y, color="red")\` or \`train(model, epochs=20)\`, mix the two: required inputs by position, options by name.

## Default values

A parameter can have a **default**, used when the call leaves it out. Parameters with defaults come after those without.`,
    },
    { t: 'python', title: 'defaults', code: 'def fare(km, start=50, per_km=15):\n    return start + per_km * km\n\nprint(fare(5))              # both defaults\nprint(fare(5, per_km=12))   # change one option by name\nprint(fare(5, 40))          # by position: start=40' },
    {
      t: 'md',
      md: `## Any number of arguments: *args and **kwargs

A parameter written \`*args\` collects any extra positional arguments into a **tuple**; \`**kwargs\` collects extra keyword arguments into a **dictionary**. (Both get their own lessons soon.) You will see them in almost every PyTorch model's code, passing options along to another function.`,
    },
    { t: 'python', title: '*args and **kwargs', code: 'def total(*args):\n    s = 0\n    for x in args:\n        s += x\n    return s\n\nprint(total(1, 2, 3), total(10, 20))\n\ndef describe(name, **kwargs):\n    print(name, kwargs)\n\ndescribe("model", layers=3, lr=0.01)' },
    {
      t: 'md',
      md: `## Wrong number of arguments

Python checks every call against the definition, and says exactly what is missing:`,
    },
    { t: 'python', title: 'a missing argument, on purpose', code: 'def fare(km, per_km):\n    return 50 + per_km * km\n\nprint(fare(5))', error: true },
  ],
}

export const scope: Page = {
  id: 'scope',
  title: 'Scope: where a name lives',
  summary: 'Each call gets its own box of variables, which disappears when the call returns. Watch it happen.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `Where do a function's variables live? Each **call** gets its own fresh box of names, called a **frame**. The parameters and every variable assigned inside the function go in that box, and the box is thrown away when the call returns.`,
    },
    { t: 'stage', scene: framesScene() },
    { t: 'python', title: 'the same program: step through it', code: FRAMES_CODE.join('\n') },
    {
      t: 'md',
      md: `When you step through the real run, the line above the variables says **Inside: main → fare** while a call is running, and the table shows only that call's variables. After the return, you are back in \`main\`, and \`km\` and \`total\` are gone.

## Local and global

Names assigned inside a function are **local**: they exist only in that call's frame. Names assigned in the main program are **global**. A function can *read* a global name, but assigning to a name inside a function makes a new local one:`,
    },
    { t: 'python', title: 'local and global', code: 'rate = 15          # global\n\ndef fare(km):\n    total = 50 + rate * km   # reads the global rate\n    return total\n\nprint(fare(2))\nprint(total)   # total was local to the call: it does not exist here', error: true },
    {
      t: 'callout',
      kind: 'tip',
      title: 'Pass it in, give it back',
      md: 'A function that reads its inputs from parameters and gives its result back with `return` is easy to test and reuse: the same inputs always give the same output. Relying on global variables makes code that is hard to follow. (Python has a `global` statement to assign a global from inside a function; you will almost never need it.)',
    },
  ],
}

export const values: Page = {
  id: 'values',
  title: 'More than one result, functions as values, and lambda',
  summary: 'Return several values at once, pass a function to another function, write tiny functions in one line, and let a function call itself.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `## Returning several values

\`return a, b\` hands back both, packed together; the caller can unpack them into two names at once.`,
    },
    { t: 'python', title: 'two results', code: 'def min_max(values):\n    lo = values[0]\n    hi = values[0]\n    for v in values:\n        if v < lo:\n            lo = v\n        if v > hi:\n            hi = v\n    return lo, hi\n\nsmallest, largest = min_max([72, 85, 31, 91, 64])\nprint(smallest, largest)' },
    {
      t: 'md',
      md: `## A function is a value too

\`def\` makes a function and points a name at it, just like \`=\` does for numbers. So a function can be passed to another function. This is how libraries let you plug in your own rule, for example which **activation function** a neural network layer should use.`,
    },
    { t: 'python', title: 'passing a function', code: 'def relu(x):\n    return max(0, x)\n\ndef square(x):\n    return x * x\n\ndef apply_to_all(f, values):\n    out = []\n    for v in values:\n        out.append(f(v))\n    return out\n\nprint(apply_to_all(relu, [-2, -1, 0, 1, 2]))\nprint(apply_to_all(square, [-2, -1, 0, 1, 2]))' },
    {
      t: 'md',
      md: `(\`out.append(v)\` adds \`v\` to the end of the list \`out\`; the lists lesson has all the list methods.)

## lambda: a function in one line

For a tiny function used once, \`lambda\` writes it without a name: \`lambda x: x * x\` is the same as the \`square\` above. It is mostly used as an argument, for example to tell \`sorted\` what to sort by.`,
    },
    { t: 'python', title: 'lambda', code: 'square = lambda x: x * x\nprint(square(7))\nnames = ["Ravi", "Asha", "Lakshmi", "Om"]\nprint(sorted(names))                   # alphabetical\nprint(sorted(names, key=len))          # by length\nprint(sorted(names, key=lambda n: n[-1]))  # by last letter' },
    {
      t: 'md',
      md: `## A function that calls itself

A function may call itself, as long as each call works on a smaller problem and there is a case that stops. This is **recursion**. $n! = n \\times (n-1)!$, with $0! = 1$ to stop:`,
    },
    { t: 'python', title: 'recursion', code: 'def factorial(n):\n    if n == 0:\n        return 1          # the case that stops\n    return n * factorial(n - 1)\n\nprint(factorial(5))' },
    {
      t: 'md',
      md: `Step through it and watch the line above the variables: **Inside: main → factorial → factorial → …**. Each call has its own \`n\`, waiting for the one below it to return. That pile of waiting calls is the **call stack**, and when something goes wrong, Python's error message lists it from the bottom up.`,
    },
  ],
}

export const docs: Page = {
  id: 'docs',
  title: 'Docstrings and help()',
  summary: 'Say what a function does in its first line, and Python shows it to anyone who asks for help. Every library function is documented this way.',
  minutes: 5,
  blocks: [
    {
      t: 'md',
      md: `A string on the first line of a function's body is its **docstring**: a description of what it does, its inputs and its result. \`help()\` shows it. Every function in NumPy, pandas and PyTorch has one, which is why \`help(np.mean)\` answers most questions.`,
    },
    { t: 'python', title: 'a docstring', code: 'def fare(km, start=50, per_km=15):\n    """Return the taxi fare in rupees for a ride of km kilometres.\n\n    start is the fixed charge and per_km the price of each kilometre.\n    """\n    return start + per_km * km\n\nhelp(fare)' },
    {
      t: 'md',
      md: `## Type hints

You can also note what type each input and the result should be: \`def fare(km: float) -> float:\`. Python does not check these when it runs, but editors and checking tools do, and they make a function's contract clear at a glance. The lesson on clear code covers them properly.`,
    },
    { t: 'python', title: 'type hints', code: 'def fare(km: float, per_km: float = 15) -> float:\n    """Taxi fare in rupees."""\n    return 50 + per_km * km\n\nprint(fare(2.5))\nprint(fare.__annotations__)' },
    {
      t: 'readmore',
      items: [
        { book: 'python-docs', where: 'The Python Tutorial, sections 4.8 (Defining Functions) and 4.9 (More on Defining Functions)', why: 'defaults, keyword arguments, *args and **kwargs, lambda, docstrings and annotations, in the official words.' },
        { book: 'python-docs', where: 'The Python Tutorial, section 9.2 (Python Scopes and Namespaces)', why: 'exactly where each name lives.' },
      ],
    },
  ],
}

export const check: Page = {
  id: 'check',
  title: 'Check yourself',
  summary: 'Nine questions: predict what a call returns, find the missing return, read the scope.',
  minutes: 9,
  blocks: [
    { t: 'md', md: '## Questions\n\nTrace each one by hand first, then check it by stepping through it in an example.' },
    { t: 'check', ids: ['fn2-call', 'fn2-none', 'fn2-default', 'fn2-keyword', 'fn2-scope', 'fn2-unpack', 'fn2-lambda', 'fn2-recursion', 'fn2-error'], title: 'Check yourself' },
  ],
}
