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

    static final long MOD = 1_000_000_007L;

    static long power(long b, long e) {               // O(log e) square-and-multiply
        long r = 1;
        b %= MOD;
        while (e > 0) {
            if ((e & 1) == 1) r = r * b % MOD;
            b = b * b % MOD;
            e >>= 1;
        }
        return r;
    }

    public static void main(String[] args) throws IOException {
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long r = nl(), k = nl();
            long rr = r % MOD, ans;
            if (rr == 1) ans = (k + 1) % MOD;             // every term is 1 mod p
            else ans = (power(rr, k + 1) - 1 + MOD) % MOD * power(rr - 1 + MOD, MOD - 2) % MOD;
            sb.append(ans).append('\n');
        }
        System.out.print(sb);
    }
}
