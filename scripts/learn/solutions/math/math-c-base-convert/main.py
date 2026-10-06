import sys
data = sys.stdin.read().split()
a, b, t = int(data[0]), int(data[1]), data[2]
DIG = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
x = int(t, a)                       # Python parses any base 2..36 into an exact big integer
out = []
while x:
    x, r = divmod(x, b)             # next digit, least significant first
    out.append(DIG[r])
print(''.join(reversed(out)) or '0')
