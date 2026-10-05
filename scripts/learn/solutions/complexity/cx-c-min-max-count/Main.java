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
        for (int i = 0; i < n; i++) a[i] = nl();
        long mn, mx, comps = 0;
        int i;
        if (n % 2 == 1) { mn = mx = a[0]; i = 1; }
        else {
            comps++;
            mn = Math.min(a[0], a[1]); mx = Math.max(a[0], a[1]);
            i = 2;
        }
        for (; i + 1 < n; i += 2) {
            long lo = a[i], hi = a[i + 1];
            comps++; if (hi < lo) { long t = lo; lo = hi; hi = t; }   // compare inside the pair
            comps++; if (lo < mn) mn = lo;                            // loser vs min
            comps++; if (hi > mx) mx = hi;                            // winner vs max
        }
        System.out.println(mn + " " + mx + " " + comps);
    }
}
