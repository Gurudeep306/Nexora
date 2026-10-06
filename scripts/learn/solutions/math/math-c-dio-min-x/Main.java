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

    public static void main(String[] args) throws IOException {
        int t = ni();
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            long a = nl(), b = nl(), c = nl();
            if (minX(a, b, c)) sb.append(X).append(' ').append(Y).append('\n');
            else sb.append("-1\n");
        }
        System.out.print(sb);
    }
}
