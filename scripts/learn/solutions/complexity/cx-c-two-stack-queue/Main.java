import java.io.*;

public class Main {
    static DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));
    static long nl() throws IOException {
        int r = in.read();
        while (r != '-' && (r < '0' || r > '9')) r = in.read();
        boolean neg = r == '-';
        if (neg) r = in.read();
        long x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = in.read(); }
        return neg ? -x : x;
    }
    static int ni() throws IOException { return (int) nl(); }

    public static void main(String[] args) throws IOException {
        int q = ni();
        long[] in = new long[q], out = new long[q];
        int ti = 0, to = 0;
        long moves = 0;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < q; i++) {
            int t = ni();
            if (t == 1) {
                in[ti++] = nl();
            } else {
                if (to == 0)                          // each element moves at most once
                    while (ti > 0) { out[to++] = in[--ti]; moves++; }
                sb.append(out[--to]).append('\n');
            }
        }
        sb.append(moves).append('\n');
        System.out.print(sb);
    }
}
