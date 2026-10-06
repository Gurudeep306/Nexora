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

    static long X, Y;

    // smallest x >= 0 with a*x + b*y = c, stored in X, Y; false if none
    static boolean minX(long a, long b, long c) {
        long aa = a, bb = b, x0 = 1, x1 = 0;
        while (bb != 0) {                    // iterative extended Euclid
            long q = aa / bb, t;
            t = aa - q * bb; aa = bb; bb = t;
            t = x0 - q * x1; x0 = x1; x1 = t;
        }
        long g = aa;
        if (c % g != 0) return false;
        long m = b / g;
        X = Math.floorMod(x0, m) * Math.floorMod(c / g, m) % m;   // both < 1e9
        Y = (c - a * X) / b;
        return true;
    }

    static long gcd(long a, long b) {
        while (b != 0) { long t = a % b; a = b; b = t; }
        return a;
    }

    public static void main(String[] args) throws IOException {
        int t = ni();
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            long a = nl(), b = nl(), c = nl();
            if (!minX(a, b, c)) { sb.append("-1\n"); continue; }
            long g = gcd(a, b), m = b / g, n = a / g;
            long q = Math.floorDiv(Y, n);
            long[] cand = {-1, 0, q, q + 1};
            long bx = 0, by = 0, best = -1;
            for (long k : cand) {
                long x = X + k * m, y = Y - k * n;
                long cost = Math.abs(x) + Math.abs(y);
                if (best < 0 || cost < best || (cost == best && x < bx)) { best = cost; bx = x; by = y; }
            }
            sb.append(bx).append(' ').append(by).append('\n');
        }
        System.out.print(sb);
    }
}
