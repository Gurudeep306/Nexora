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
        long[] a = new long[n];
        long total = 0;
        for (int i = 0; i < n; i++) { a[i] = nl(); total += a[i]; }
        long left = 0;                        // sum of a[0..i-1]
        for (int i = 0; i < n; i++) {
            if (left == total - left - a[i]) { System.out.println(i); return; }
            left += a[i];
        }
        System.out.println(-1);
    }
}
