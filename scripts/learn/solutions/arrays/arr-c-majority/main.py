import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
cand, count = None, 0
for x in a:                          # pair off different values
    if count == 0:
        cand = x
    count += 1 if x == cand else -1
print(cand if 2 * a.count(cand) > n else -1)   # verify the survivor
