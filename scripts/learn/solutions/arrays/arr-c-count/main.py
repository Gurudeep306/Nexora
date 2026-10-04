import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
cnt = [0] * 101
for v in data[1:1 + n]:
    cnt[int(v)] += 1                 # count every value once
q = int(data[1 + n])
print('\n'.join(str(cnt[int(x)]) for x in data[2 + n:2 + n + q]))
