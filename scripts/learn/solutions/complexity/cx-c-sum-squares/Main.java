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
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long n = nl();
            long[] f = {n, n + 1, 2 * n + 1};
            if (f[0] % 2 == 0) f[0] /= 2; else f[1] /= 2;   // exact division by 2
            for (int i = 0; i < 3; i++)
                if (f[i] % 3 == 0) { f[i] /= 3; break; }     // exact division by 3
            long r = 1;
            for (int i = 0; i < 3; i++) r = r * (f[i] % MOD) % MOD;
            sb.append(r).append('\n');
        }
        System.out.print(sb);
    }
}
