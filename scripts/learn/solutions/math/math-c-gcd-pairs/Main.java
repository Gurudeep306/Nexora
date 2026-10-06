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

    public static void main(String[] args) throws IOException {
        final int N = 200000;
        int[] mu = new int[N + 1];
        boolean[] comp = new boolean[N + 1];
        int[] primes = new int[N];
        int pc = 0;
        mu[1] = 1;
        for (int i = 2; i <= N; i++) {
            if (!comp[i]) { primes[pc++] = i; mu[i] = -1; }
            for (int j = 0; j < pc; j++) {
                int p = primes[j];
                if ((long) i * p > N) break;
                comp[i * p] = true;
                if (i % p == 0) { mu[i * p] = 0; break; }
                mu[i * p] = -mu[i];
            }
        }
        long[] pre = new long[N + 1];
        for (int i = 1; i <= N; i++) pre[i] = pre[i - 1] + mu[i];
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long a = nl(), b = nl(), k = nl();
            long A = a / k, B = b / k, res = 0;
            long lim = Math.min(A, B);
            for (long d = 1; d <= lim;) {
                long qa = A / d, qb = B / d;
                long e = Math.min(A / qa, B / qb);
                res += (pre[(int) e] - pre[(int) d - 1]) * qa * qb;
                d = e + 1;
            }
            sb.append(res).append('\n');
        }
        System.out.print(sb);
    }
}
