import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
leaders = []
mx = float('-inf')                   # max of everything to the right
for x in reversed(a):
    if x > mx:
        leaders.append(x)
        mx = x
print(' '.join(map(str, reversed(leaders))))
