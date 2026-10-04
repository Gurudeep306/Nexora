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
        int n = ni();
        long S = nl();
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        long s = 0;
        int lo = 0, best = Integer.MAX_VALUE;
        for (int hi = 0; hi < n; hi++) {
            s += a[hi];                           // extend to the right
            while (s >= S) {                      // big enough: record, then shrink
                best = Math.min(best, hi - lo + 1);
                s -= a[lo++];
            }
        }
        System.out.println(best == Integer.MAX_VALUE ? 0 : best);
    }
}
