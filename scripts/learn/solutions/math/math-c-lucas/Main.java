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
        int p = ni(), t = ni();
        long[] F = new long[p], IF = new long[p];
        F[0] = 1;
        for (int i = 1; i < p; i++) F[i] = F[i - 1] * i % p;
        long b = F[p - 1], e = p - 2, inv = 1;
        for (; e > 0; e >>= 1, b = b * b % p) if ((e & 1) == 1) inv = inv * b % p;
        IF[p - 1] = inv;
        for (int i = p - 1; i > 0; i--) IF[i - 1] = IF[i] * i % p;
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            long n = nl(), r = nl(), res = 1;
            while ((n > 0 || r > 0) && res != 0) {       // one base-p digit at a time
                int a = (int) (n % p), c = (int) (r % p);
                res = c > a ? 0 : res * F[a] % p * IF[c] % p * IF[a - c] % p;
                n /= p;
                r /= p;
            }
            sb.append(res).append('\n');
        }
        System.out.print(sb);
    }
}
