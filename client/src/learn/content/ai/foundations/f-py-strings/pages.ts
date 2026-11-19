import type { Page } from '@/learn/types'
import { indexScene } from './scenes.ts'

export const text: Page = {
  id: 'text',
  title: 'Strings: text in quotes',
  summary: 'How to write text in Python, put quotes and new lines inside it, and measure how long it is.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `Most data an AI model learns from starts as text: reviews, questions, whole books. In Python, text is a **string** (type \`str\`): a sequence of characters between quotes. Single and double quotes mean exactly the same thing, so pick whichever saves you an escape.`,
    },
    { t: 'python', title: 'quotes', code: "a = 'single quotes'\nb = \"double quotes\"\nc = \"it's easy when the other quote is inside\"\nprint(a)\nprint(b)\nprint(c)" },
    {
      t: 'md',
      md: `## Special characters: escapes

A backslash \`\\\` starts an **escape**: two characters that stand for one you can't type directly. The most useful are \`\\n\` (a new line) and \`\\t\` (a tab).`,
    },
    { t: 'python', title: 'escapes', code: 'print("Roll\\tMarks")\nprint("17\\t72")\nprint("first line\\nsecond line")\nprint("a quote: \\" and a backslash: \\\\")' },
    {
      t: 'md',
      md: `When you want backslashes kept as they are (Windows file paths, or the regular expressions you'll meet in NLP), put an \`r\` before the quote: a **raw string**.`,
    },
    { t: 'python', title: 'raw strings', code: 'print("C:\\new_folder")    # \\n became a new line!\nprint(r"C:\\new_folder")   # raw: kept as typed' },
    {
      t: 'md',
      md: `## Strings over many lines

Three quotes in a row start a string that can run over several lines, new lines included.`,
    },
    { t: 'python', title: 'triple quotes', code: 'poem = """Twinkle, twinkle,\nlittle star."""\nprint(poem)' },
    {
      t: 'md',
      md: `## How long is it? len()

\`len()\` counts the characters. Spaces and punctuation count too.`,
    },
    { t: 'python', title: 'len()', code: 'print(len("cat"))\nprint(len("New Delhi"))   # the space counts\nprint(len(""))            # the empty string' },
  ],
}

export const index: Page = {
  id: 'index',
  title: 'Indexing and slicing',
  summary: 'Every character has a number. Pick one with s[i], a stretch with s[a:b], and walk backwards with a negative step.',
  minutes: 8,
  blocks: [
    { t: 'stage', scene: indexScene() },
    {
      t: 'md',
      md: `## One character: s[i]

Each character has an **index**, its position counted **from 0**. Negative indexes count from the right, so \`s[-1]\` is the last character whatever the length.`,
    },
    { t: 'python', title: 'indexing', code: 's = "NEXORA"\nprint(s[0], s[3])\nprint(s[-1], s[-6])\nprint(s[len(s) - 1])   # the long way to say s[-1]' },
    {
      t: 'md',
      md: `## A stretch: s[start:stop:step]

A **slice** takes characters from \`start\` up to **but not including** \`stop\`. That rule looks odd at first, but it makes the sums work: \`s[a:b]\` has exactly \`b - a\` characters, and \`s[:k] + s[k:]\` is always the whole string.`,
    },
    { t: 'python', title: 'slicing', code: 's = "NEXORA"\nprint(s[1:4])\nprint(s[:3], s[3:])\nprint(s[:3] + s[3:] == s)\nprint(s[::2])\nprint(s[::-1])   # reversed' },
    {
      t: 'md',
      md: `A slice that goes past the end is not an error: Python simply stops at the end. A single index past the end is an error:`,
    },
    { t: 'python', title: 'past the end', code: 's = "NEXORA"\nprint(s[4:100])   # fine: stops at the end\nprint(s[10])      # IndexError', error: true },
    {
      t: 'md',
      md: `## Strings cannot be changed

A string is **immutable**: once made, its characters can't be changed. To "change" one, build a new string from slices and point the name at it (remember: names point at values).`,
    },
    { t: 'python', title: 'immutable', code: 'word = "cat"\nword = "b" + word[1:]   # a new string, "bat"\nprint(word)\nword[0] = "h"           # not allowed', error: true },
  ],
}

export const methods: Page = {
  id: 'methods',
  title: 'String methods',
  summary: 'The functions every string carries with it: change case, trim spaces, find, replace, split into words and join them back.',
  minutes: 10,
  blocks: [
    {
      t: 'md',
      md: `A **method** is a function that belongs to a value. You call it with a dot: \`text.upper()\`. Strings have dozens; these are the ones used all the time when cleaning text for a model. None of them changes the original string (it can't be changed); each returns a new one.

## Case and spaces`,
    },
    { t: 'python', title: 'case and spaces', code: 'raw = "   Hello World  "\nprint(raw.upper())\nprint(raw.lower())\nprint("[" + raw.strip() + "]")    # strip removes spaces at both ends\nprint(raw.strip().title())\nprint(raw)                         # unchanged' },
    {
      t: 'md',
      md: `## Finding and checking`,
    },
    { t: 'python', title: 'find, count, in, startswith', code: 'review = "great phone, great camera, poor battery"\nprint("great" in review)          # is it in there?\nprint(review.count("great"))       # how many times?\nprint(review.find("camera"))       # index where it starts\nprint(review.find("price"))        # -1 means not found\nprint(review.startswith("great"))\nprint(review.endswith("battery"))' },
    {
      t: 'md',
      md: `## Replacing`,
    },
    { t: 'python', title: 'replace', code: 'review = "great phone, great camera"\nprint(review.replace("great", "good"))\nprint(review.replace("great", "good", 1))   # only the first one' },
    {
      t: 'md',
      md: `## Splitting into words, joining back

\`split()\` cuts a string into a **list** of pieces (lists are a lesson of their own soon; for now, a list is the values in square brackets). With no argument it splits on any run of spaces. \`join()\` is the reverse: it glues pieces together, with the string you call it on in between. Splitting text into words is the very first step of every language model (the NLP course calls the pieces **tokens**).`,
    },
    { t: 'python', title: 'split and join', code: 'sentence = "the cat sat on the mat"\nwords = sentence.split()\nprint(words)\nprint(len(words), "words")\nprint("-".join(words))\nrow = "17,Asha,72,85"\nprint(row.split(","))   # split on commas: a row of a CSV file' },
    {
      t: 'md',
      md: `## Is it a number?

Text read from a file or typed by a user is always a string, even when it looks like a number. These methods check before you convert:`,
    },
    { t: 'python', title: 'isdigit and friends', code: 'print("2026".isdigit())\nprint("20.5".isdigit())   # the dot is not a digit\nprint("Asha".isalpha())\nprint("   ".isspace())' },
    {
      t: 'callout',
      kind: 'tip',
      title: 'Find every method',
      md: '`help(str)` lists every string method, and `dir("")` gives their names. The full list, with exact rules, is in the official Python documentation: The Python Standard Library → Built-in Types → String Methods.',
    },
  ],
}

export const formatting: Page = {
  id: 'formatting',
  title: 'f-strings and printing',
  summary: 'Put values inside text with f-strings, control decimals and widths, and make print() lay out its output the way you want.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `To build a sentence from values, put an \`f\` before the quote and the values in curly brackets. This is an **f-string** (formatted string literal), and it is the way modern Python formats text.`,
    },
    { t: 'python', title: 'f-strings', code: 'name = "Asha"\nmarks = 72\nprint(f"{name} scored {marks} marks.")\nprint(f"Next year: {marks + 5}")   # any expression works inside' },
    {
      t: 'md',
      md: `## Format specifications

After a colon inside the brackets, a short code says how to show the value. These matter whenever you print results: an accuracy of \`0.9123456\` is easier to read as \`91.2%\`.`,
    },
    { t: 'python', title: 'decimals, percent, width', code: 'acc = 0.9123456\nprint(f"{acc:.2f}")      # 2 decimal places\nprint(f"{acc:.1%}")      # as a percentage\nprint(f"{1234567:,}")    # thousands separators\nprint(f"[{7:>4}]")       # right-aligned in 4 spaces\nprint(f"[{7:<4}]")       # left-aligned\nprint(f"[{7:04}]")       # padded with zeros' },
    {
      t: 'md',
      md: `| Spec | Meaning | Example | Shows |
|---|---|---|---|
| \`.2f\` | fixed, 2 decimals | \`f"{3.14159:.2f}"\` | \`3.14\` |
| \`.1%\` | percent, 1 decimal | \`f"{0.912:.1%}"\` | \`91.2%\` |
| \`,\` | thousands separator | \`f"{1234567:,}"\` | \`1,234,567\` |
| \`>8\`, \`<8\`, \`^8\` | right, left, centre in 8 spaces | \`f"{'hi':>8}"\` | \`      hi\` |
| \`.2e\` | scientific | \`f"{0.000123:.2e}"\` | \`1.23e-04\` |

## Show the name too: {x=}

Adding \`=\` prints the expression and its value. It is the quickest way to check a variable while you work.`,
    },
    { t: 'python', title: 'self-documenting f-strings', code: 'learning_rate = 0.01\nepochs = 20\nprint(f"{learning_rate=}, {epochs=}")\nprint(f"{learning_rate * epochs = }")' },
    {
      t: 'md',
      md: `## print() has options too

\`print\` puts a space between its arguments and a new line at the end. \`sep\` and \`end\` change both.`,
    },
    { t: 'python', title: 'sep and end', code: 'print("a", "b", "c")\nprint("a", "b", "c", sep="")\nprint("a", "b", "c", sep=", ")\nprint("no new line", end=" ... ")\nprint("same line")' },
    {
      t: 'md',
      md: `## New in Python 3.14: template strings

A **t-string** looks like an f-string with a \`t\` in front, but instead of a finished string it gives back the pieces: the fixed text and each value, separately. Libraries use this to handle values safely, for example to escape user input before it goes into a web page. You will rarely write one yourself as a beginner; it is here so you recognise it.`,
    },
    { t: 'python', title: 't-strings (Python 3.14+)', code: 'item = "notebook"\ntemplate = t"Buy one {item} today"\nprint(type(template))\nprint(list(template))' },
  ],
}

export const unicode: Page = {
  id: 'unicode',
  title: 'Characters, Unicode and UTF-8',
  summary: 'Every character is a number underneath. That is how Python handles every language, Hindi and Tamil included, and how text becomes numbers for a model.',
  minutes: 7,
  blocks: [
    {
      t: 'md',
      md: `A computer stores only numbers, so every character has a number: its **code point**, from a world-wide table called **Unicode**. \`ord()\` gives a character's number and \`chr()\` goes back.`,
    },
    { t: 'python', title: 'ord and chr', code: 'print(ord("A"), ord("a"), ord("0"))\nprint(chr(65), chr(97))\nprint(ord("न"), ord("₹"))' },
    {
      t: 'md',
      md: `Unicode covers every writing system, so Python strings handle Hindi, Tamil or emoji exactly like English. \`len()\` counts code points, which is not always what a reader sees as one letter: Devanagari vowel signs are code points of their own.`,
    },
    { t: 'python', title: 'every language', code: 'greet = "नमस्ते"\nprint(greet, len(greet))\nprint(list(greet))          # each code point\nprint("தமிழ்".upper() == "தமிழ்")   # scripts without capitals stay the same' },
    {
      t: 'md',
      md: `## From characters to bytes: UTF-8

To save text in a file or send it over a network, each code point becomes one to four **bytes** (numbers from 0 to 255). The standard way to do it is **UTF-8**. English letters take one byte each; Devanagari letters take three.`,
    },
    { t: 'python', title: 'encode and decode', code: 'word = "नमस्ते"\ndata = word.encode("utf-8")\nprint(data)\nprint(len(word), "code points,", len(data), "bytes")\nprint(data.decode("utf-8"))' },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Why AI cares',
      md: 'A language model cannot read letters either: text is turned into numbers first. Some models work directly on UTF-8 bytes; most use **subword tokens** built from them (NLP → Subword tokenisation). And from **Python 3.15**, UTF-8 is the default encoding everywhere, so files you open without naming an encoding are read as UTF-8 on every computer (PEP 686).',
    },
    {
      t: 'readmore',
      items: [
        { book: 'python-docs', where: 'The Python Tutorial, section 3.1.2 (Text)', why: 'strings, quotes, indexing and slicing in the official words.' },
        { book: 'python-docs', where: 'The Python Tutorial, section 7.1 (Fancier Output Formatting)', why: 'f-strings and format specifications in full.' },
        { book: 'python-docs', where: 'The Python HOWTOs, Unicode HOWTO', why: 'code points, encodings and UTF-8, step by step.' },
        { book: 'python-docs', where: "What's New In Python 3.14, PEP 750 (Template string literals)", why: 't-strings and what they are for.' },
      ],
    },
  ],
}

export const check: Page = {
  id: 'check',
  title: 'Check yourself',
  summary: 'Nine questions on indexing, slicing, methods and f-strings.',
  minutes: 8,
  blocks: [
    { t: 'md', md: '## Questions\n\nPredict each answer first. To check one, press Edit on any example above, paste the code and run it.' },
    { t: 'check', ids: ['fs-index', 'fs-slice', 'fs-reverse', 'fs-len', 'fs-split', 'fs-join', 'fs-fstring', 'fs-immutable', 'fs-bytes'], title: 'Check yourself' },
  ],
}
