import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
cnt = 0
i = 1
while i * i <= n:
    if n % i == 0:
        cnt += 1 if i * i == n else 2   # the pair (i, n/i)
    i += 1
print(cnt)
