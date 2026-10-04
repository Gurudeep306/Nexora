import sys
data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
odd = [int(x) & 1 for x in data[2:2 + n]]


def at_most(K):                      # subarrays with at most K odd numbers
    total = lo = cnt = 0
    for hi in range(n):
        cnt += odd[hi]
        while cnt > K:
            cnt -= odd[lo]
            lo += 1
        total += hi - lo + 1         # every start in [lo, hi]
    return total


print(at_most(k) - at_most(k - 1))
