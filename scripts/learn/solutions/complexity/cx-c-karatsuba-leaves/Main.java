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
            int k = 64 - Long.numberOfLeadingZeros(n - 1);    // bit length of n-1 = ceil(log2 n)
            long r = 1, b = 3;
            for (; k > 0; k >>= 1, b = b * b % MOD) if ((k & 1) == 1) r = r * b % MOD;
            sb.append(r).append('\n');
        }
        System.out.print(sb);
    }
}
