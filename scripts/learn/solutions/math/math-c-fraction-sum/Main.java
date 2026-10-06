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

    static final long P = 1_000_000_007L;

    static long power(long b, long e) {
        long r = 1;
        b %= P;
        while (e > 0) {
            if ((e & 1) == 1) r = r * b % P;
            b = b * b % P;
            e >>= 1;
        }
        return r;
    }

    public static void main(String[] args) throws IOException {
        int n = ni();
        long total = 0;
        for (int i = 0; i < n; i++) {
            long a = nl(), b = nl();
            a = (a % P + P) % P;                          // negative numerators
            total = (total + a * power(b, P - 2)) % P;
        }
        System.out.println(total);
    }
}
