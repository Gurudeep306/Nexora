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

    // inverse of a modulo m, or -1 if gcd(a, m) != 1
    static long inverse(long a, long m) {
        long r0 = a % m, r1 = m, s0 = 1, s1 = 0;      // invariant: r_i ≡ a * s_i (mod m)
        while (r1 != 0) {
            long q = r0 / r1;
            long t = r0 - q * r1; r0 = r1; r1 = t;
            t = s0 - q * s1; s0 = s1; s1 = t;
        }
        if (r0 != 1) return -1;
        return ((s0 % m) + m) % m;
    }

    public static void main(String[] args) throws IOException {
        int t = ni();
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            long a = nl(), m = nl();
            sb.append(inverse(a, m)).append('\n');
        }
        System.out.print(sb);
    }
}
