import sys

data = sys.stdin.buffer.read().split()
T = int(data[0])
out = []
pos = 1
for _ in range(T):
    n = int(data[pos]); k = int(data[pos + 1]); pos += 2
    # O(n) recurrence: seat(1)=0; seat(m) = (seat(m-1)+k) mod m
    seat = 0
    for m in range(2, n + 1):
        seat = (seat + k) % m
    out.append(str(seat + 1))   # 1-based survivor
sys.stdout.write('\n'.join(out) + '\n')
