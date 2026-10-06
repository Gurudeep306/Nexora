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

    // inverse of a modulo m (gcd(a, m) = 1), extended Euclid
    static long inverse(long a, long m) {
        long r0 = a % m, r1 = m, s0 = 1, s1 = 0;
        while (r1 != 0) {
            long q = r0 / r1, t;
            t = r0 - q * r1; r0 = r1; r1 = t;
            t = s0 - q * s1; s0 = s1; s1 = t;
        }
        return ((s0 % m) + m) % m;
    }

    public static void main(String[] args) throws IOException {
        int t = ni();
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            long a1 = nl(), m1 = nl(), a2 = nl(), m2 = nl();
            long g = gcd(m1, m2);
            long d = ((a2 - a1) % m2 + m2) % m2;
            if (d % g != 0) { sb.append("-1\n"); continue; }
            long mg = m2 / g;
            long k = (d / g) % mg * inverse(m1 / g % mg, mg) % mg;   // m1 * k ≡ d (mod m2)
            sb.append(a1 + m1 * k).append('\n');                       // < lcm <= 1e18
        }
        System.out.print(sb);
    }
}
