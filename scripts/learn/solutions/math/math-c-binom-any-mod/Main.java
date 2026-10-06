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

    static long inverse(long a, long m) {          // gcd(a, m) = 1
        long r0 = a % m, r1 = m, s0 = 1, s1 = 0;
        while (r1 != 0) {
            long q = r0 / r1, t;
            t = r0 - q * r1; r0 = r1; r1 = t;
            t = s0 - q * s1; s0 = s1; s1 = t;
        }
        return ((s0 % m) + m) % m;
    }

    static long power(long b, long e, long m) {
        long r = 1 % m;
        for (b %= m; e > 0; e >>= 1, b = b * b % m) if ((e & 1) == 1) r = r * b % m;
        return r;
    }

    public static void main(String[] args) throws IOException {
        int n = ni();
        long m = nl();
        int q = ni();
        long[] tmp = new long[12];
        int w = 0;
        long mm = m;
        for (long d = 2; d * d <= mm; d++)
            if (mm % d == 0) { tmp[w++] = d; while (mm % d == 0) mm /= d; }
        if (mm > 1) tmp[w++] = mm;
        long[] ps = Arrays.copyOf(tmp, w);              // distinct primes of m
        long[] unit = new long[n + 1];                   // coprime part of C(n, k) mod m
        int[][] ex = new int[w][n + 1];                  // exponent of each prime in C(n, k)
        int[] c = new int[w];
        long u = 1 % m;
        unit[0] = u;
        for (int k = 1; k <= n; k++) {
            long a = n - k + 1, b = k;
            for (int j = 0; j < w; j++) {
                while (a % ps[j] == 0) { a /= ps[j]; c[j]++; }
                while (b % ps[j] == 0) { b /= ps[j]; c[j]--; }
            }
            u = u * (a % m) % m * inverse(b % m, m) % m;  // b is now coprime to m
            unit[k] = u;
            for (int j = 0; j < w; j++) ex[j][k] = c[j];
        }
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) {
            int k = ni();
            long r = unit[k];
            for (int j = 0; j < w; j++) r = r * power(ps[j], ex[j][k], m) % m;
            sb.append(r).append('\n');
        }
        System.out.print(sb);
    }
}
