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

    // all subset sums of a[lo..hi), in sorted order, by repeated merging
    static long[] sortedSums(long[] a, int lo, int hi) {
        long[] s = new long[1 << (hi - lo)], t = new long[s.length];
        int m = 1;
        for (int i = lo; i < hi; i++) {
            long x = a[i];
            int p = 0, q = 0, k = 0;
            while (p < m || q < m) {              // merge s with s + x
                if (q == m || (p < m && s[p] <= s[q] + x)) t[k++] = s[p++];
                else t[k++] = s[q++] + x;
            }
            long[] tmp = s; s = t; t = tmp;
            m *= 2;
        }
        return s;
    }

    public static void main(String[] args) throws IOException {
        int n = ni();
        long T = nl();
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        long[] L = sortedSums(a, 0, n / 2), R = sortedSums(a, n / 2, n);
        long cnt = 0;
        int i = 0, j = R.length - 1;
        while (i < L.length && j >= 0) {
            long s = L[i] + R[j];
            if (s < T) i++;
            else if (s > T) j--;
            else {                                // multiply the runs of equal values
                long ci = 0, cj = 0, x = L[i], y = R[j];
                while (i < L.length && L[i] == x) { i++; ci++; }
                while (j >= 0 && R[j] == y) { j--; cj++; }
                cnt += ci * cj;
            }
        }
        System.out.println(cnt);
    }
}
