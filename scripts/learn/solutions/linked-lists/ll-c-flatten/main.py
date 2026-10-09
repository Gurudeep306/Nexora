import sys

toks = sys.stdin.buffer.read().split()
p = 0
n = int(toks[p]); p += 1
v = [0] * n
nxt = [0] * n
chd = [0] * n
for i in range(n):
    v[i] = int(toks[p]); p += 1
    nxt[i] = int(toks[p]); p += 1
    chd[i] = int(toks[p]); p += 1

# iterative DFS: the stack holds RETURN POINTS — what recursion holds on frames
stk = []
out = []
cur = 0  # head is node 0
while cur != -1 or stk:
    if cur == -1:
        cur = stk.pop()
        continue
    out.append(str(v[cur]))        # preorder: settle THIS node first
    if chd[cur] != -1:
        stk.append(nxt[cur])       # resume here AFTER the child subtree
        nxt[cur] = chd[cur]        # splice the child in (explicit relink)
        chd[cur] = -1              # detach: flattening destroys the hierarchy
    cur = nxt[cur]                 # dive into child, or advance along the level

print(' '.join(out))
