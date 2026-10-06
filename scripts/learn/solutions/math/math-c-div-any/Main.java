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

    static long n, total = 0;
    static int k;
    static long[] a;

    static long gcd(long x, long y) { while (y != 0) { long t = x % y; x = y; y = t; } return x; }

    static void dfs(int i, long l, int sz) {
        if (i == k) {
            if (sz > 0) total += (sz % 2 == 1 ? 1 : -1) * (n / l);
            return;
        }
        dfs(i + 1, l, sz);
        long x = l / gcd(l, a[i]);
        if (x <= n / a[i]) dfs(i + 1, x * a[i], sz + 1);   // prune lcm > n (and avoid overflow)
    }

    public static void main(String[] args) throws IOException {
        n = nl();
        k = ni();
        a = new long[k];
        for (int i = 0; i < k; i++) a[i] = nl();
        dfs(0, 1, 0);
        System.out.println(total);
    }
}
