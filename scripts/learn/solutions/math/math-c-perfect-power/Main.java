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

    // r^k, or n + 1 if it exceeds n
    static long cappedPow(long r, int k, long n) {
        long p = 1;
        for (int i = 0; i < k; i++) {
            if (p > n / r) return n + 1;
            p *= r;
        }
        return p;
    }

    static long iroot(long n, int k) {
        long r = Math.max(1, Math.round(Math.pow((double) n, 1.0 / k)));
        while (r > 1 && cappedPow(r, k, n) > n) r--;
        while (cappedPow(r + 1, k, n) <= n) r++;
        return r;
    }

    public static void main(String[] args) throws IOException {
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long n = nl();
            long a = n;
            int best = 1;
            for (int k = 59; k >= 2; k--) {
                long r = iroot(n, k);
                if (r >= 2 && cappedPow(r, k, n) == n) { a = r; best = k; break; }
            }
            sb.append(a).append(' ').append(best).append('\n');
        }
        System.out.print(sb);
    }
}
