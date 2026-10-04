import sys
data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
a = data[2:2 + n]
r = k % n                            # only k mod n matters

def rev(i, j):                       # reverse a[i..j] in place
    while i < j:
        a[i], a[j] = a[j], a[i]
        i += 1
        j -= 1

rev(0, n - 1)
rev(0, r - 1)
rev(r, n - 1)
print(' '.join(x.decode() for x in a))
