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
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = ni();
        int lo = 0, zeros = 0, best = 0;
        for (int hi = 0; hi < n; hi++) {
            if (a[hi] == 0) zeros++;
            while (zeros > k) {                   // too many zeros to flip: shrink
                if (a[lo] == 0) zeros--;
                lo++;
            }
            best = Math.max(best, hi - lo + 1);
        }
        System.out.println(best);
    }
}
