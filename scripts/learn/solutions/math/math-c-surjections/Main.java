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
        while (e > 0) {
            if ((e & 1) == 1) r = r * b % MOD;
            b = b * b % MOD;
            e >>= 1;
        }
        return r;
    }

    public static void main(String[] args) throws IOException {
        long n = nl();
        int k = ni();
        long[] f = new long[k + 1], inv = new long[k + 1];
        f[0] = 1;
        for (int i = 1; i <= k; i++) f[i] = f[i - 1] * i % MOD;
        inv[k] = pw(f[k], MOD - 2);
        for (int i = k; i > 0; i--) inv[i - 1] = inv[i] * i % MOD;
        long ans = 0;
        for (int i = 0; i <= k; i++) {
            long c = f[k] * inv[i] % MOD * inv[k - i] % MOD;
            long term = c * pw(k - i, n) % MOD;
            ans = (i % 2 == 1 ? ans - term + MOD : ans + term) % MOD;
        }
        System.out.println(ans);
    }
}
