import sys
data = sys.stdin.buffer.read().split()


def iroot(n, k):
    r = max(1, round(n ** (1.0 / k)))   # float estimate, then exact correction
    while r > 1 and r ** k > n:
        r -= 1
    while (r + 1) ** k <= n:
        r += 1
    return r


t = int(data[0])
out = []
for x in data[1:1 + t]:
    n = int(x)
    ans = f"{n} 1"
    for k in range(59, 1, -1):          # largest exponent first
        r = iroot(n, k)
        if r >= 2 and r ** k == n:
            ans = f"{r} {k}"
            break
    out.append(ans)
print('\n'.join(out))
