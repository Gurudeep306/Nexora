from collections import Counter
import sys
data = sys.stdin.buffer.read().split()
n, T = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))


def all_sums(part):
    sums = [0]
    for x in part:
        sums += [s + x for s in sums]
    return sums


right = Counter(all_sums(a[n // 2:]))           # how often each right-half sum occurs
get = right.get
print(sum(get(T - s, 0) for s in all_sums(a[:n // 2])))
