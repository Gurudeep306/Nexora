import sys
data = sys.stdin.buffer.read().split()
q = int(data[0])
ins, outs, res = [], [], []
moves = 0
i = 1
for _ in range(q):
    if data[i] == b'1':
        ins.append(data[i + 1])          # values are only echoed: keep the raw tokens
        i += 2
    else:
        i += 1
        if not outs:
            moves += len(ins)
            ins.reverse()                # moving one by one reverses the order
            outs, ins = ins, []
        res.append(outs.pop())
res.append(str(moves).encode())
sys.stdout.buffer.write(b'\n'.join(res) + b'\n')
