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
        for (int k = 0; k < n; k++) a[k] = nl();
        int i = n - 2;
        while (i >= 0 && a[i] >= a[i + 1]) i--;        // pivot: last ascent
        if (i >= 0) {
            int j = n - 1;
            while (a[j] <= a[i]) j--;                  // rightmost value bigger than the pivot
            long t = a[i]; a[i] = a[j]; a[j] = t;
        }
        for (int l = i + 1, r = n - 1; l < r; l++, r--) { long t = a[l]; a[l] = a[r]; a[r] = t; }
        StringBuilder sb = new StringBuilder();
        for (int k = 0; k < n; k++) sb.append(a[k]).append(k + 1 == n ? '\n' : ' ');
        System.out.print(sb);
    }
}
