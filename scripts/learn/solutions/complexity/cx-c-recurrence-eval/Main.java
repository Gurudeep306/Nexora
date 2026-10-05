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
        long[] chain = new long[70];
        while (T-- > 0) {
            long a = nl(), b = nl(), n = nl();
            int len = 0;
            for (long m = n; m > 0; m /= b) chain[len++] = m;     // n, n/b, n/b^2, ...
            long t = 0, am = a % MOD;
            for (int i = len - 1; i >= 0; i--) t = (am * t + chain[i] % MOD) % MOD;  // bottom-up
            sb.append(t).append('\n');
        }
        System.out.print(sb);
    }
}
