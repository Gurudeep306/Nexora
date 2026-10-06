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

    public static void main(String[] args) throws IOException {
        int n = ni();
        int[] a = new int[n];
        int M = 1;
        for (int i = 0; i < n; i++) { a[i] = ni(); M = Math.max(M, a[i]); }
        int[] mu = new int[M + 1];
        int[] primes = new int[M + 1];
        int pc = 0;
        boolean[] comp = new boolean[M + 1];
        mu[1] = 1;
        for (int i = 2; i <= M; i++) {
            if (!comp[i]) { primes[pc++] = i; mu[i] = -1; }
            for (int j = 0; j < pc; j++) {
                int p = primes[j];
                if ((long) i * p > M) break;
                comp[i * p] = true;
                if (i % p == 0) { mu[i * p] = 0; break; }
                mu[i * p] = -mu[i];
            }
        }
        int[] freq = new int[M + 1];
        for (int x : a) freq[x]++;
        long ans = 0;
        for (int d = 1; d <= M; d++) {
            if (mu[d] == 0) continue;
            long c = 0;
            for (int v = d; v <= M; v += d) c += freq[v];
            ans += mu[d] * (c * (c - 1) / 2);
        }
        System.out.println(ans);
    }
}
