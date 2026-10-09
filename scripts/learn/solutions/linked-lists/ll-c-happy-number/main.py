def f(x):
    """Sum of the squares of the digits."""
    s = 0
    while x:
        d = x % 10
        s += d * d
        x //= 10
    return s


data = open(0).read().split()
T = int(data[0])
out = []
for i in range(1, T + 1):
    x = int(data[i])
    # Floyd on the implicit digit-square chain
    slow = x
    fast = f(x)
    while fast != 1 and slow != fast:
        slow = f(slow)
        fast = f(f(fast))
    out.append('1' if fast == 1 else '0')
print('\n'.join(out))
