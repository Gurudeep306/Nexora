import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
print(len(set(data[1:1 + n])))      # a hash set of the tokens: O(n) expected
