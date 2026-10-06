import java.io.*;
import java.util.*;

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

    // a * b mod m for 0 <= a, b < m <= 1e18 by double-and-add (partial sums < 2m < 2^63)
    static long mulmod(long a, long b, long m) {
        long r = 0;
        while (b > 0) {
            if ((b & 1) == 1) { r += a; if (r >= m) r -= m; }
            a += a; if (a >= m) a -= m;
            b >>= 1;
        }
        return r;
    }

    public static void main(String[] args) throws IOException {
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) {
            long a = nl(), b = nl(), m = nl();
            sb.append(mulmod(Math.floorMod(a, m), Math.floorMod(b, m), m)).append('\n');
        }
        System.out.print(sb);
    }
}
