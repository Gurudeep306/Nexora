import sys
data = sys.stdin.buffer.read().split()
q = int(data[0])
st, out = [], []
for i in range(1, 2 * q, 2):
    x = int(data[i + 1])
    if data[i] == b'1':
        st.append(x)
    else:
        m = min(x, len(st))
        if m:
            out.append(sum(st[-m:]))      # pop the top m elements in one slice
            del st[-m:]
        else:
            out.append(0)
print('\n'.join(map(str, out)))
