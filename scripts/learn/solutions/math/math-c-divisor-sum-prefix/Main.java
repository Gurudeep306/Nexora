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
        final long MOD = 1_000_000_007L;
        long n = nl();
        long total = 0;
        for (long d = 1; d <= n;) {
            long q = n / d, e = n / q;
            long x = d + e, y = e - d + 1;
            if (x % 2 == 0) x /= 2; else y /= 2;
            long block = (x % MOD) * (y % MOD) % MOD;
            total = (total + (q % MOD) * block) % MOD;
            d = e + 1;
        }
        System.out.println(total);
    }
}
