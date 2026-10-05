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
        long mx1 = Long.MIN_VALUE, mx2 = Long.MIN_VALUE, mn1 = Long.MAX_VALUE, mn2 = Long.MAX_VALUE;
        for (int i = 0; i < n; i++) {
            long x = nl();
            if (x > mx1) { mx2 = mx1; mx1 = x; } else if (x > mx2) mx2 = x;
            if (x < mn1) { mn2 = mn1; mn1 = x; } else if (x < mn2) mn2 = x;
        }
        System.out.println(Math.max(mx1 * mx2, mn1 * mn2));   // two largest, or two most negative
    }
}
