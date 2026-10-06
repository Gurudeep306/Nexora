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
        int T = ni();
        int[] q = new int[T];
        int N = 1;
        for (int i = 0; i < T; i++) { q[i] = ni(); N = Math.max(N, q[i]); }
        long[] D = new long[N + 1], f = new long[N + 1];
        D[0] = 1; f[0] = 1;
        for (int i = 1; i <= N; i++) {
            D[i] = (i * D[i - 1] + (i % 2 == 1 ? MOD - 1 : 1)) % MOD;
            f[i] = f[i - 1] * i % MOD;
        }
        StringBuilder sb = new StringBuilder();
        for (int n : q) sb.append(D[n] * pw(f[n], MOD - 2) % MOD).append('\n');
        System.out.print(sb);
    }
}
