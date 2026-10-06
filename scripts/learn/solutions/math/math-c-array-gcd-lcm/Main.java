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

    static long gcd(long a, long b) {
        while (b != 0) { long t = a % b; a = b; b = t; }
        return a;
    }

    public static void main(String[] args) throws IOException {
        final long CAP = 1_000_000_000_000_000_000L;
        int n = ni();
        long g = 0, l = 1;
        boolean over = false;
        for (int i = 0; i < n; i++) {
            long x = nl();
            g = gcd(g, x);
            if (!over) {
                long q = l / gcd(l, x);
                if (q > CAP / x) over = true;
                else l = q * x;
            }
        }
        System.out.println(g + "\n" + (over ? -1 : l));
    }
}
