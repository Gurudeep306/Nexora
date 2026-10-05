import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
S = 0
i = 1
while i <= n:
    q = n // i
    last = n // q                    # every i' in [i, last] has quotient q
    S += q * (last - i + 1)
    i = last + 1
print(S)
