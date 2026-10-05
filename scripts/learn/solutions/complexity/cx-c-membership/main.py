import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
have = set(map(int, data[1:1 + n]))      # O(1) expected lookups
q = int(data[1 + n])
print('\n'.join('YES' if x in have else 'NO' for x in map(int, data[2 + n:2 + n + q])))
