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

    static final long MOD = 1_000_000_007L;

    static long pw(long b, long e) {
        long r = 1;
        b %= MOD;
        while (e > 0) { if ((e & 1) == 1) r = r * b % MOD; b = b * b % MOD; e >>= 1; }
        return r;
    }

    public static void main(String[] args) throws IOException {
        long m = nl(), k = nl();
        long e = k % (MOD - 1);
        long S = 0;
        for (long y = 1; y < m; y++) S = (S + pw(y, e)) % MOD;
        System.out.println((m - S * pw(pw(m, e), MOD - 2) % MOD + MOD) % MOD);
    }
}
