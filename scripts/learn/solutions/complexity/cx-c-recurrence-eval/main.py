import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
t = int(data[0])
out = []
for q in range(t):
    a, b, n = int(data[1 + 3 * q]), int(data[2 + 3 * q]), int(data[3 + 3 * q])
    chain = []
    while n > 0:                 # n, n//b, n//b^2, ...
        chain.append(n)
        n //= b
    v = 0
    for m in reversed(chain):    # fold from T(0) upwards
        v = (a * v + m) % MOD
    out.append(v)
print('\n'.join(map(str, out)))
