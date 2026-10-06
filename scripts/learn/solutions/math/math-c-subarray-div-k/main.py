import sys
data = sys.stdin.buffer.read().split()
from collections import Counter
n, k = int(data[0]), int(data[1])
cnt = Counter({0: 1})                         # the empty prefix
p = 0
ans = 0
for x in data[2:2 + n]:
    p = (p + int(x)) % k                      # Python % is non-negative
    ans += cnt[p]                             # pair with every earlier equal residue
    cnt[p] += 1
print(ans)
