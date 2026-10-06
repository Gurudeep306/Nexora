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

    static long gcd(long a, long b) { while (b != 0) { long t = a % b; a = b; b = t; } return a; }

    static long inverse(long a, long m) {          // gcd(a, m) = 1
        long r0 = a % m, r1 = m, s0 = 1, s1 = 0;
        while (r1 != 0) {
            long q = r0 / r1, t;
            t = r0 - q * r1; r0 = r1; r1 = t;
            t = s0 - q * s1; s0 = s1; s1 = t;
        }
        return ((s0 % m) + m) % m;
    }

    public static void main(String[] args) throws IOException {
        int n = ni();
        long X = 0, M = 1;                          // all x ≡ X (mod M) satisfy the prefix
        boolean ok = true;
        for (int i = 0; i < n; i++) {
            long a = nl(), m = nl();
            if (!ok) continue;
            long g = gcd(M, m);
            long d = ((a - X % m) % m + m) % m;
            if (d % g != 0) { ok = false; continue; }
            long mg = m / g;
            long k = (d / g) % mg * inverse(M / g % mg, mg) % mg;
            X += M * k;                              // < lcm <= 1e18
            M = M / g * m;
        }
        System.out.println(ok ? X : -1);
    }
}
