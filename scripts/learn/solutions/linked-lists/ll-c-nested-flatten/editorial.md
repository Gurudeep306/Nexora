## Intuition
`[1,[4,[6]],2]` is the multilevel linked list wearing a parser's clothes: a nested list interrupts the current level, and you must RESUME where you left off. Recursion would ride the call stack; the interview-grade version makes that stack explicit. The trick that makes an explicit stack emit LEFT-TO-RIGHT order: a stack is LIFO, so to pop items left-to-right you must PUSH them right-to-left — in reverse.

## Approach
Parse once into a tree of items (integers and lists), then walk it with an explicit stack. Pop an item: integer → output it; list → push its elements back in REVERSE order so they pop left-to-right:

```python
stack = [root]
while stack:
    item = stack.pop()
    if isinstance(item, int):
        out.append(item)
    else:
        for child in reversed(item):   # reverse so pops go left-to-right
            stack.append(child)
```

Parsing is a straightforward recursive-descent-free tokenizer: read characters; `[` pushes a fresh list onto a parse stack, `]` pops it and appends it to its parent, digits/`-` accumulate an integer. The parse stack is also explicit — no recursion anywhere:

```python
root = []
parse = [root]
i = 0
while i < len(s):
    c = s[i]
    if c == '[':
        lst = []
        parse[-1].append(lst)
        parse.append(lst)
    elif c == ']':
        parse.pop()
    elif c == ',' or c.isspace():
        pass
    else:                      # start of an integer (possibly negative)
        j = i
        while j < len(s) and (s[j].isdigit() or s[j] == '-'):
            j += 1
        parse[-1].append(int(s[i:j]))
        i = j - 1
    i += 1
```

## Why it works
The flatten stack invariant: the stack, read bottom-to-top with each list-level's pending items stored in reverse, equals the remaining output in left-to-right depth-first order. When a list pops, pushing its children in reverse makes the FIRST child the top of the stack — so the next pop continues depth-first into it, exactly where a recursive `for child in list: flatten(child)` would go. Integers pop and print in order. The parse stack invariant is dual: `parse[-1]` is always the innermost open list, so every completed token lands in the right parent. The empty structure `[]` (and any all-empty nesting like `[[],[[]]]`) produces zero integers → `EMPTY`.

## Complexity
$O(m)$ time and $O(m)$ space where $m$ is the total number of integers plus list brackets — each token is parsed once, each item pushed and popped a constant number of times. Depth ≤ 10 bounds the parse stack trivially, but the flatten stack is worst-case $O(m)$ (a flat list of $10^4$ integers is pushed whole). Recursion would be $O(\text{depth})$ stack — safer here only because the spec caps depth; the explicit version has no such dependency.

## Pitfalls
- Pushing children left-to-right: they pop RIGHT-to-left and the output is mirrored. The reverse push is the entire trick.
- Negative integers: the tokenizer must accept a leading `-`; splitting on `,` alone breaks on `[-1,[-2]]` if you forget the sign.
- Empty lists at any level: they contribute nothing but must not crash — a list item with zero children just pushes nothing.
- Recursion on deep input: with depth capped at 10 recursion survives, but the explicit stack is the transferable skill (iterators, tree/graph DFS) and never depends on a depth guarantee.
- Printing a trailing space or an empty line instead of `EMPTY` when zero integers are produced.
