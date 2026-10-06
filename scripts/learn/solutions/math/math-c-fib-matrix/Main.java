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
    static final long M = 1000000007L;

    public static void main(String[] args) throws IOException {
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) {
            long n = nl();
            long a = 0, b = 1;
            for (int bit = 62; bit >= 0; bit--) {
                long c = a * ((2 * b - a + M) % M) % M;
                long d = (a * a + b * b) % M;
                if (((n >> bit) & 1) == 1) { a = d; b = (c + d) % M; }
                else { a = c; b = d; }
            }
            sb.append(a).append('\n');
        }
        System.out.print(sb);
    }
}
