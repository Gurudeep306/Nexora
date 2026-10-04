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

    public static void main(String[] args) throws IOException {
        int n = ni();
        long x = nl();
        final long NEG = Long.MIN_VALUE / 4;     // "minus infinity" that cannot overflow
        long keep = x, del = NEG, best = x;
        for (int i = 1; i < n; i++) {
            x = nl();
            del = Math.max(del + x, keep);       // deleted earlier, or delete x now
            keep = Math.max(keep + x, x);        // plain Kadane
            best = Math.max(best, Math.max(keep, del));
        }
        System.out.println(best);
    }
}
