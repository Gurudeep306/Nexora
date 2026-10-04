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
        int n = ni();
        long[] a = new long[n], out = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl() % MOD;
        long pre = 1;
        for (int i = 0; i < n; i++) { out[i] = pre; pre = pre * a[i] % MOD; }    // product left of i
        long suf = 1;
        for (int i = n - 1; i >= 0; i--) {                                       // times product right of i
            out[i] = out[i] * suf % MOD;
            suf = suf * a[i] % MOD;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(out[i]).append(i + 1 == n ? '\n' : ' ');
        System.out.print(sb);
    }
}
