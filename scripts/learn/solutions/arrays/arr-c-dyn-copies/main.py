import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
cap, copies = 1, 0
while cap < n:                       # full before a push: copy everything, double
    copies += cap
    cap *= 2
print(copies, cap)
