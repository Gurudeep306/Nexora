import type { Page } from '@/learn/types'
import { ALIAS_CODE, aliasScene } from './scenes.ts'

export const lists: Page = {
  id: 'lists',
  title: 'Lists: many values in order',
  summary: 'A list keeps any number of values in order. Index and slice it like a string, and, unlike a string, change it.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `A dataset is many values: the marks of a whole class, the pixels of a photo, the words of a sentence. The basic Python container for "many values, in order" is the **list**: values separated by commas, inside square brackets.`,
    },
    { t: 'python', title: 'making a list', code: 'marks = [72, 85, 64, 91]\nprint(marks)\nprint(len(marks))\nmixed = [17, "Asha", 72.5, True]   # any types, mixed\nempty = []\nprint(mixed, empty)' },
    {
      t: 'md',
      md: `## Indexing and slicing: exactly like strings

Everything you learned for strings works for lists: \`marks[0]\` is the first item, \`marks[-1]\` the last, \`marks[1:3]\` a slice, \`marks[::-1]\` reversed. \`in\` asks whether a value is in the list.`,
    },
    { t: 'python', title: 'index, slice, in', code: 'marks = [72, 85, 64, 91]\nprint(marks[0], marks[-1])\nprint(marks[1:3])\nprint(marks[::-1])\nprint(85 in marks, 100 in marks)' },
    {
      t: 'md',
      md: `## Lists can change

Here lists and strings part ways. A list is **mutable**: you can replace an item in place.`,
    },
    { t: 'python', title: 'change an item', code: 'marks = [72, 85, 64, 91]\nmarks[2] = 70          # correct a mark\nprint(marks)\nmarks[0:2] = [75, 88]   # replace a slice\nprint(marks)' },
    {
      t: 'md',
      md: `## Built-in functions for lists

\`len\`, \`sum\`, \`min\` and \`max\` work on any list of numbers. With them, the mean is one line.`,
    },
    { t: 'python', title: 'sum, min, max', code: 'marks = [72, 85, 64, 91]\nprint(sum(marks), min(marks), max(marks))\nprint("mean:", sum(marks) / len(marks))\nprint("range:", max(marks) - min(marks))' },
  ],
}

export const methods: Page = {
  id: 'methods',
  title: 'List methods: add, remove, sort, search',
  summary: 'append and extend, insert, pop and remove, sort and sorted, reverse, index and count: what each does, and which ones change the list.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `## Adding items`,
    },
    { t: 'python', title: 'append, extend, insert', code: 'marks = [72, 85]\nmarks.append(64)          # one item, at the end\nprint(marks)\nmarks.extend([91, 58])    # every item of another list\nprint(marks)\nmarks.insert(0, 99)       # at index 0, pushing the rest along\nprint(marks)\nprint(marks + [1, 2])     # + makes a NEW list; marks is unchanged\nprint(marks)' },
    {
      t: 'md',
      md: `## Removing items`,
    },
    { t: 'python', title: 'pop, remove, del', code: 'marks = [99, 72, 85, 64, 91]\nlast = marks.pop()       # removes and returns the last item\nprint(last, marks)\nfirst = marks.pop(0)     # or the item at an index\nprint(first, marks)\nmarks.remove(85)         # the first item equal to 85\nprint(marks)\ndel marks[0]             # delete by index\nprint(marks)' },
    {
      t: 'md',
      md: `## Sorting: sort() versus sorted()

This pair causes many bugs. \`marks.sort()\` sorts **this** list in place and returns \`None\`. \`sorted(marks)\` returns a **new** sorted list and leaves the original alone.`,
    },
    { t: 'python', title: 'sort and sorted', code: 'marks = [72, 85, 64, 91]\nprint(sorted(marks))                 # a new list\nprint(sorted(marks, reverse=True))   # highest first\nprint(marks)                         # unchanged\nresult = marks.sort()                # sorts marks itself\nprint(marks, result)                 # result is None!' },
    {
      t: 'md',
      md: `## Searching`,
    },
    { t: 'python', title: 'index and count', code: 'votes = ["cat", "dog", "cat", "cat", "dog"]\nprint(votes.count("cat"))\nprint(votes.index("dog"))   # the first position of "dog"\nvotes.reverse()\nprint(votes)' },
    {
      t: 'md',
      md: `| Method | What it does | Changes the list? | Returns |
|---|---|---|---|
| \`append(x)\` | add \`x\` at the end | yes | \`None\` |
| \`extend(items)\` | add every item | yes | \`None\` |
| \`insert(i, x)\` | add \`x\` at index \`i\` | yes | \`None\` |
| \`pop(i=-1)\` | remove the item at \`i\` | yes | the item |
| \`remove(x)\` | remove the first \`x\` | yes | \`None\` |
| \`sort()\` | sort in place | yes | \`None\` |
| \`reverse()\` | reverse in place | yes | \`None\` |
| \`index(x)\` | position of the first \`x\` | no | an int |
| \`count(x)\` | how many times \`x\` appears | no | an int |
| \`copy()\` | a shallow copy | no | a new list |

A pattern worth noticing: methods that **change** the list return \`None\`.`,
    },
  ],
}

export const aliasing: Page = {
  id: 'aliasing',
  title: 'Two names, one list: copying',
  summary: 'Assignment never copies a list. Watch a change made through one name appear through another, and learn the three ways to copy.',
  minutes: 8,
  blocks: [
    {
      t: 'md',
      md: `In the first Python lesson we drew variables as names pointing at values. With numbers the picture hardly mattered. With lists it decides what your program does, because a list can change while names keep pointing at it.`,
    },
    { t: 'stage', scene: aliasScene() },
    { t: 'python', title: 'the same code: step through it', code: ALIAS_CODE.join('\n') },
    {
      t: 'md',
      md: `\`a\` and \`b\` print the same three items because they are the same list. \`is\` checks whether two names point at the very same object, while \`==\` only checks equal contents:`,
    },
    { t: 'python', title: 'is versus ==', code: 'a = [1, 2, 3]\nb = a\nc = a.copy()\nprint(a == b, a is b)\nprint(a == c, a is c)' },
    {
      t: 'md',
      md: `## Three ways to copy a list

\`a.copy()\`, \`list(a)\` and \`a[:]\` all make a new list with the same items. They are **shallow** copies: a list inside the list is still shared. For lists of lists, \`copy.deepcopy\` copies all the way down. (\`import copy\` loads \`copy\`, one of the modules that come with Python; the modules lesson explains \`import\` properly.)`,
    },
    { t: 'python', title: 'shallow and deep copies', code: 'import copy\ngrid = [[1, 2], [3, 4]]\nshallow = grid.copy()\ndeep = copy.deepcopy(grid)\ngrid[0][0] = 99\nprint(shallow)   # the inner list is shared: it sees 99\nprint(deep)      # fully separate' },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why AI cares',
      md: 'NumPy arrays and PyTorch tensors follow the same rule, at a much bigger scale: a slice of an array is often a **view** onto the same memory, not a copy. Changing it changes the original. When a model’s numbers change mysteriously, two names on one array is a common cause.',
    },
  ],
}

export const nested: Page = {
  id: 'nested',
  title: 'Lists of lists: tables and grids',
  summary: 'A list can hold lists. That makes a table, a grid of pixels or a small matrix, read with two indexes.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `A list of lists is a table: each inner list is a row. \`table[i]\` is row \`i\`, and \`table[i][j]\` is the item in row \`i\`, column \`j\`. This is how a small grey image or a matrix is stored before you learn NumPy.`,
    },
    { t: 'python', title: 'a table of marks', code: '#          maths physics chemistry\nmarks = [[72,   85,     64],    # student 0\n         [91,   58,     77],    # student 1\n         [66,   70,     88]]    # student 2\nprint(marks[1])        # row 1: all of student 1\nprint(marks[1][2])     # student 1, chemistry\nfor row in marks:\n    print(sum(row) / len(row))   # each student\'s mean' },
    {
      t: 'md',
      md: `## Columns need a loop

Rows come for free; a column (one subject for everyone) needs a loop over the rows. NumPy makes columns as easy as rows; this awkwardness is one reason it exists.`,
    },
    { t: 'python', title: 'one column', code: 'marks = [[72, 85, 64], [91, 58, 77], [66, 70, 88]]\nphysics = []\nfor row in marks:\n    physics.append(row[1])\nprint(physics, sum(physics) / len(physics))' },
    {
      t: 'md',
      md: `## A trap: [[0] * 3] * 3

\`[0] * 3\` is \`[0, 0, 0]\`. Multiplying a list of lists the same way does **not** make three rows: it makes three names for one row. Change one and all three change. Build the rows in a loop instead.`,
    },
    { t: 'python', title: 'the trap, and the fix', code: 'bad = [[0] * 3] * 3\nbad[0][0] = 5\nprint(bad)           # every row changed!\ngood = []\nfor _ in range(3):\n    good.append([0] * 3)\ngood[0][0] = 5\nprint(good)' },
  ],
}

export const tuples: Page = {
  id: 'tuples',
  title: 'Tuples: fixed groups, packing and unpacking',
  summary: 'A tuple is a list that cannot change. Use it for a fixed group of values, and unpack it into names in one line.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `A **tuple** is written with round brackets, or just commas. It is like a list, but **immutable**: it can't be changed after it is made. Use one for a fixed group that belongs together: a point $(x, y)$, a date, a shape like (28, 28).`,
    },
    { t: 'python', title: 'tuples', code: 'point = (3, 4)\nshape = 28, 28          # the brackets are optional\nprint(point[0], shape)\nprint(type(shape))\nsingle = (5,)           # a one-item tuple needs a comma\nprint(type(single), type((5)))' },
    { t: 'python', title: 'tuples cannot change', code: 'point = (3, 4)\npoint[0] = 10', error: true },
    {
      t: 'md',
      md: `## Packing and unpacking

When you wrote \`a, b = b, a\` to swap two values, or \`return lo, hi\` in a function, Python was **packing** values into a tuple and **unpacking** them into names. A starred name collects the rest.`,
    },
    { t: 'python', title: 'unpacking', code: 'x, y = (3, 4)\nprint(x, y)\nfirst, *rest = [72, 85, 64, 91]\nprint(first, rest)\n*early, last = [72, 85, 64, 91]\nprint(early, last)\nfor name, mark in [("Asha", 72), ("Ravi", 85)]:\n    print(name, "scored", mark)' },
    {
      t: 'md',
      md: `The last loop unpacks each pair as it goes: this pattern, looping over pairs, is everywhere in data code (the next lessons add \`zip\` and \`enumerate\`, which make the pairs for you).

## List or tuple?

Use a **list** for a collection that grows or changes (the marks of everyone who has taken the test so far). Use a **tuple** for a fixed record whose positions mean something (a student's (name, roll number), an image's (height, width)). Tuples can also be dictionary keys, which lists can't (next lesson).`,
    },
    {
      t: 'readmore',
      items: [
        { book: 'python-docs', where: 'The Python Tutorial, sections 3.1.3 (Lists), 5.1 (More on Lists) and 5.3 (Tuples and Sequences)', why: 'every list method and tuple packing, in the official words.' },
        { book: 'python-docs', where: 'The Python Standard Library, copy (Shallow and deep copy operations)', why: 'exactly what a shallow and a deep copy share.' },
      ],
    },
  ],
}

export const check: Page = {
  id: 'check',
  title: 'Check yourself',
  summary: 'Nine questions: predict the list, find the shared object, choose list or tuple.',
  minutes: 9,
  blocks: [
    { t: 'md', md: '## Questions\n\nDraw the names and lists for each one before you answer: it is the fastest way to get them right.' },
    { t: 'check', ids: ['fl-slice', 'fl-append', 'fl-pop', 'fl-sort', 'fl-alias', 'fl-copy', 'fl-grid', 'fl-trap', 'fl-unpack'], title: 'Check yourself' },
  ],
}
