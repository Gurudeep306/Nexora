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

    static long isqrt(long m) {
        long r = (long) Math.sqrt((double) m);        // guess, may be off by one
        while (r * r > m) r--;
        while ((r + 1) * (r + 1) <= m) r++;           // now r^2 <= m < (r+1)^2
        return r;
    }

    public static void main(String[] args) throws IOException {
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long a = nl(), b = nl();
            sb.append(isqrt(b) - isqrt(a - 1)).append('\n');
        }
        System.out.print(sb);
    }
}
