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
        final long P = 1_000_000_007L;
        int t = ni();
        int[] q = new int[t];
        int N = 1;
        for (int i = 0; i < t; i++) { q[i] = ni(); N = Math.max(N, q[i]); }
        long[] inv = new long[N + 1], H = new long[N + 1];
        inv[1] = 1;
        for (int i = 2; i <= N; i++) inv[i] = P - (P / i) * inv[(int) (P % i)] % P;
        for (int i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % P;
        StringBuilder sb = new StringBuilder();
        for (int x : q) sb.append(H[x]).append('\n');
        System.out.print(sb);
    }
}
