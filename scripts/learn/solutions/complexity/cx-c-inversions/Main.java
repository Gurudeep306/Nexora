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
        long[] a = new long[n], buf = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        long inv = 0;
        for (int w = 1; w < n; w *= 2) {                  // bottom-up merge sort
            for (int lo = 0; lo < n - w; lo += 2 * w) {
                int mid = lo + w, hi = Math.min(lo + 2 * w, n), i = lo, j = mid, k = lo;
                while (i < mid && j < hi) {
                    if (a[i] <= a[j]) buf[k++] = a[i++];
                    else { inv += mid - i; buf[k++] = a[j++]; }   // a[j] jumps over the rest of the left run
                }
                while (i < mid) buf[k++] = a[i++];
                while (j < hi) buf[k++] = a[j++];
                System.arraycopy(buf, lo, a, lo, hi - lo);
            }
        }
        System.out.println(inv);
    }
}
