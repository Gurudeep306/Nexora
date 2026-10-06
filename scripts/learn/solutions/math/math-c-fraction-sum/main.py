import sys
data = sys.stdin.buffer.read().split()
P = 10**9 + 7
n = int(data[0])
total = 0
for i in range(n):
    a, b = int(data[1 + 2 * i]), int(data[2 + 2 * i])
    total = (total + a % P * pow(b, P - 2, P)) % P     # a / b = a * b^(p-2); Python's % is non-negative
print(total)
