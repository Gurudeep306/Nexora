import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
cnt, sig = 1, 1
d = 2
while d * d <= n:
    if n % d == 0:
        e, pw, term = 0, 1, 1
        while n % d == 0:
            n //= d
            e += 1
            pw *= d
            term += pw            # 1 + d + ... + d^e
        cnt *= e + 1
        sig *= term
    d += 1 if d == 2 else 2
if n > 1:                         # leftover prime
    cnt *= 2
    sig *= n + 1
print(cnt, sig)
