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

    static final long[] BASES = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};

    // a * b mod m without overflow, for 0 <= a, b < m <= 4e18 (so a + a < 2^63)
    static long mulmod(long a, long b, long m) {
        long r = 0;
        while (b > 0) {
            if ((b & 1) == 1) { r += a; if (r >= m) r -= m; }
            a += a; if (a >= m) a -= m;
            b >>= 1;
        }
        return r;
    }

    static long powmod(long a, long e, long m) {
        long r = 1;
        a %= m;
        while (e > 0) {
            if ((e & 1) == 1) r = mulmod(r, a, m);
            a = mulmod(a, a, m);
            e >>= 1;
        }
        return r;
    }

    static boolean isPrime(long n) {
        if (n < 2) return false;
        for (long p : BASES) if (n % p == 0) return n == p;
        long d = n - 1;
        int r = 0;
        while ((d & 1) == 0) { d >>= 1; r++; }
        for (long a : BASES) {
            long x = powmod(a, d, n);
            if (x == 1 || x == n - 1) continue;
            boolean witness = true;
            for (int i = 1; i < r && witness; i++) {
                x = mulmod(x, x, n);
                if (x == n - 1) witness = false;
            }
            if (witness) return false;
        }
        return true;
    }

    public static void main(String[] args) throws IOException {
        int t = ni();
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) sb.append(isPrime(nl()) ? "YES" : "NO").append('\n');
        System.out.print(sb);
    }
}
