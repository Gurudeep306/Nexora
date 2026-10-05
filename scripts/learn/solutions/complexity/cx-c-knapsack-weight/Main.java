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
        int n = ni(), W = ni();
        long[] best = new long[W + 1];
        for (int i = 0; i < n; i++) {
            int w = ni();
            long v = nl();
            for (int c = W; c >= w; c--)          // downwards: each item at most once
                best[c] = Math.max(best[c], best[c - w] + v);
        }
        System.out.println(best[W]);
    }
}
