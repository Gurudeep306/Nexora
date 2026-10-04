import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
first = second = -1                  # values are >= 0, so -1 means "none"
for x in map(int, data[1:1 + n]):
    if x > first:
        first, second = x, first
    elif second < x < first:
        second = x
print(second)
