import sys
data = sys.stdin.buffer.read().split()
P = 10**9 + 7
t = int(data[0])
q = list(map(int, data[1:1 + t]))
N = max(q)
inv = [0, 1] + [0] * (N - 1)
for i in range(2, N + 1):
    inv[i] = P - (P // i) * inv[P % i] % P     # inv(i) = -(p // i) * inv(p mod i)
H = [0] * (N + 1)
acc = 0
for i in range(1, N + 1):
    acc = (acc + inv[i]) % P
    H[i] = acc
print('\n'.join(str(H[x]) for x in q))
