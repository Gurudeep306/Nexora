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
    static final long P = 1000000007L;

    static long power(long b, long e, long m) {
        long r = 1 % m;
        while (e > 0) {
            if ((e & 1) == 1) r = r * b % m;
            b = b * b % m;
            e >>= 1;
        }
        return r;
    }

    public static void main(String[] args) throws IOException {
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) {
            long a = nl(), b = nl(), c = nl();
            long r = a % P, ans;
            if (r == 0) ans = (b == 0 && c > 0) ? 1 : 0;
            else ans = power(r, power(b % (P - 1), c, P - 1), P);
            sb.append(ans).append('\n');
        }
        System.out.print(sb);
    }
}
