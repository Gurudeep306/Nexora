import sys

s = sys.stdin.buffer.read().decode().strip()

# ---- parse into nested lists with an explicit parse stack (no recursion) ----
root = []
parse = [root]
i = 0
L = len(s)
while i < L:
    c = s[i]
    if c == '[':
        lst = []
        parse[-1].append(lst)
        parse.append(lst)
    elif c == ']':
        parse.pop()
    elif c == ',' or c.isspace():
        pass
    else:  # start of an integer, possibly negative
        j = i
        while j < L and (s[j].isdigit() or s[j] == '-'):
            j += 1
        parse[-1].append(int(s[i:j]))
        i = j - 1
    i += 1

# ---- flatten with an explicit stack: push list items in REVERSE so pops go left-to-right ----
stack = [root]
out = []
while stack:
    item = stack.pop()
    if isinstance(item, list):
        for k in range(len(item) - 1, -1, -1):
            stack.append(item[k])
    else:
        out.append(str(item))

print(' '.join(out) if out else 'EMPTY')
