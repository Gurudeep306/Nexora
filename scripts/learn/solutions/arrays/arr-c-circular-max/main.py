import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
total = cur_max = best_max = cur_min = best_min = a[0]
for x in a[1:]:
    total += x
    cur_max = max(x, cur_max + x)    # best non-wrapping
    best_max = max(best_max, cur_max)
    cur_min = min(x, cur_min + x)    # worst middle piece
    best_min = min(best_min, cur_min)
print(best_max if best_max < 0 else max(best_max, total - best_min))
