import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
memo = {0: 0}                       # shared across queries: values floor(n / 2^i 3^j)
out = []
for n in map(int, data[1:1 + t]):
    stack = [n]
    while stack:                    # iterative memoised DFS
        m = stack[-1]
        if m in memo:
            stack.pop()
            continue
        x, y = m // 2, m // 3
        if x in memo and y in memo:
            memo[m] = memo[x] + memo[y] + 1
            stack.pop()
        else:
            if x not in memo:
                stack.append(x)
            if y not in memo:
                stack.append(y)
    out.append(memo[n])
print('\n'.join(map(str, out)))
