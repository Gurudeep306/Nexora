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

    static long power(long b, long e) {
        long r = 1;
        b %= M;
        while (e > 0) {
            if ((e & 1) == 1) r = r * b % M;
            b = b * b % M;
            e >>= 1;
        }
        return r;
    }

    public static void main(String[] args) throws IOException {
        int k = ni();
        long d = 1, s = 1;
        for (int i = 0; i < k; i++) {
            long p = nl(), e = nl();
            d = d * ((e + 1) % M) % M;
            long r = p % M, term;
            if (r == 1) term = (e + 1) % M;
            else term = (power(r, e + 1) - 1 + M) % M * power((r - 1 + M) % M, M - 2) % M;
            s = s * term % M;
        }
        System.out.println(d + " " + s);
    }
}
