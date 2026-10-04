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
        long T = nl();
        long[] a = new long[n];
        for (int k = 0; k < n; k++) a[k] = nl();
        int i = 0, j = n - 1;
        boolean found = false;
        while (i < j) {
            long s = a[i] + a[j];
            if (s == T) { found = true; break; }
            if (s < T) i++;    // a[i] is too small for every partner left of j
            else j--;          // a[j] is too large for every partner right of i
        }
        System.out.println(found ? "YES" : "NO");
    }
}
