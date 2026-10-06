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
        long n = nl();
        long cnt = 1, sig = 1;
        for (long d = 2; d * d <= n; d += (d == 2 ? 1 : 2)) {
            if (n % d != 0) continue;
            int e = 0;
            long term = 1, pw = 1;
            while (n % d == 0) { n /= d; e++; pw *= d; term += pw; }
            cnt *= e + 1;
            sig *= term;
        }
        if (n > 1) { cnt *= 2; sig *= n + 1; }
        System.out.println(cnt + " " + sig);
    }
}
