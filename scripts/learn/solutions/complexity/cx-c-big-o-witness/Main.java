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

    static long d, b, c;

    static long q(long n) { return d * n * n - b * n - c; }

    public static void main(String[] args) throws IOException {
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long a = nl(), C = nl();
            b = nl();
            c = nl();
            d = C - a;
            long c0 = Math.max(1, b > 0 ? b / (2 * d) : 0);   // integer minimiser is c0 or c0 + 1
            long m = q(c0 + 1) < 0 ? c0 + 1 : q(c0) < 0 ? c0 : 0;
            if (m == 0) { sb.append("1\n"); continue; }        // q >= 0 for every n >= 1
            long lo = m, hi = 2_000_000;                       // q(lo) < 0, q(hi) >= 0
            while (lo < hi) {                                  // last n with q(n) < 0
                long mid = (lo + hi + 1) / 2;
                if (q(mid) < 0) lo = mid; else hi = mid - 1;
            }
            sb.append(lo + 1).append('\n');
        }
        System.out.print(sb);
    }
}
