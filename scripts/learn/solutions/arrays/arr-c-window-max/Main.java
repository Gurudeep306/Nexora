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
        int n = ni(), k = ni();
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        long s = 0;
        for (int i = 0; i < k; i++) s += a[i];
        long best = s;                           // the first window, not 0
        for (int i = k; i < n; i++) {
            s += a[i] - a[i - k];                // one enters, one leaves
            best = Math.max(best, s);
        }
        System.out.println(best);
    }
}
