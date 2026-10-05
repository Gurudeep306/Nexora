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
        final long P = 1_000_000_007L;
        int T = ni();
        int[] q = new int[T];
        int mx = 1;
        for (int i = 0; i < T; i++) { q[i] = ni(); mx = Math.max(mx, q[i]); }
        long[] inv = new long[mx + 1], H = new long[mx + 1];
        inv[1] = 1;
        for (int i = 2; i <= mx; i++) inv[i] = (P - (P / i) * inv[(int) (P % i)] % P) % P;
        for (int i = 1; i <= mx; i++) H[i] = (H[i - 1] + inv[i]) % P;
        StringBuilder sb = new StringBuilder();
        for (int n : q) {
            long ans = (2L * (n + 1) % P * H[n] % P - 4L * n % P + P) % P;   // 2(n+1)H_n - 4n
            sb.append(ans).append('\n');
        }
        System.out.print(sb);
    }
}
