import sys
data = sys.stdin.buffer.read().split()
M = 10**9 + 7
k, n = int(data[0]), int(data[1])
c = list(map(int, data[2:2 + k]))
a = list(map(int, data[2 + k:2 + 2 * k]))


def mul(A, B):
    Bt = list(zip(*B))
    return [[sum(x * y for x, y in zip(row, col)) % M for col in Bt] for row in A]


if n < k:
    print(a[n])
else:
    C = [c[:]] + [[1 if j == i - 1 else 0 for j in range(k)] for i in range(1, k)]   # companion matrix
    R = [[int(i == j) for j in range(k)] for i in range(k)]
    e = n - k + 1
    while e:
        if e & 1:
            R = mul(R, C)
        C = mul(C, C)
        e >>= 1
    v0 = a[::-1]                                  # (a_{k-1}, ..., a_0)
    print(sum(x * y for x, y in zip(R[0], v0)) % M)
