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
        int t = ni();
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            long p = nl(), q = nl();
            long g = gcd(Math.abs(p), Math.abs(q));
            p /= g; q /= g;
            if (q < 0) { p = -p; q = -q; }
            sb.append(p).append('/').append(q).append('\n');
        }
        System.out.print(sb);
    }
}
