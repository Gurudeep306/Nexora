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
        final long MOD = 1_000_000_007L;
        int T = ni();
        int[] qs = new int[T];
        int N = 1;
        for (int i = 0; i < T; i++) { qs[i] = ni(); N = Math.max(N, qs[i]); }
        long[] inv = new long[N + 1], H = new long[N + 1];
        inv[1] = 1;
        for (int i = 2; i <= N; i++) inv[i] = (MOD - (MOD / i) * inv[(int) (MOD % i)] % MOD) % MOD;  // linear inverses
        for (int i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % MOD;                              // H_i mod p
        StringBuilder sb = new StringBuilder();
        for (int n : qs) sb.append(H[n]).append('\n');
        System.out.print(sb);
    }
}
