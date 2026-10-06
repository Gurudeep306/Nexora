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
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long n = nl(), m = nl();
            long[] ps = new long[12];
            int r = 0;
            for (long d = 2; d * d <= m; d++)
                if (m % d == 0) {
                    ps[r++] = d;
                    while (m % d == 0) m /= d;
                }
            if (m > 1) ps[r++] = m;
            long total = 0;
            for (int mask = 0; mask < (1 << r); mask++) {
                long d = 1;
                int bits = 0;
                for (int i = 0; i < r; i++)
                    if ((mask >> i & 1) == 1) { d *= ps[i]; bits++; }
                total += (bits % 2 == 1 ? -1 : 1) * (n / d);
            }
            sb.append(total).append('\n');
        }
        System.out.print(sb);
    }
}
