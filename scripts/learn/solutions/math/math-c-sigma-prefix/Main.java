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

    static long tri(long x) {
        long a = x, b = x + 1;
        if (a % 2 == 0) a /= 2; else b /= 2;
        return (a % M) * (b % M) % M;
    }

    public static void main(String[] args) throws IOException {
        long n = nl();
        long r = (long) Math.sqrt((double) n);
        while (r * r > n) r--;
        while ((r + 1) * (r + 1) <= n) r++;
        long s = 0;
        for (long i = 1; i <= r; i++) {
            long q = n / i;
            s = (s + i % M * (q % M) + tri(q)) % M;
        }
        s = ((s - r % M * tri(r)) % M + M) % M;
        System.out.println(s);
    }
}
