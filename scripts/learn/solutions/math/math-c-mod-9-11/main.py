import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
out = []
for s in data[1:1 + t]:
    digits = s[::-1]                                  # units digit first
    total = sum(digits) - 48 * len(digits)            # bytes → digit values
    alt = (sum(digits[0::2]) - sum(digits[1::2])) - 48 * ((len(digits) + 1) // 2 - len(digits) // 2)
    out.append(f"{total % 9} {alt % 11}")             # Python % is non-negative
print('\n'.join(out))
