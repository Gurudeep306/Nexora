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
        long c1 = 0, c2 = 1;
        int k1 = 0, k2 = 0;
        for (long x : a) {
            if (x == c1) k1++;
            else if (x == c2) k2++;
            else if (k1 == 0) { c1 = x; k1 = 1; }
            else if (k2 == 0) { c2 = x; k2 = 1; }
            else { k1--; k2--; }                 // discard a triple of different values
        }
        int n1 = 0, n2 = 0;
        for (long x : a) { if (x == c1) n1++; else if (x == c2) n2++; }
        boolean ok1 = 3L * n1 > n, ok2 = 3L * n2 > n;    // verify both candidates
        StringBuilder sb = new StringBuilder();
        if (ok1 && ok2) sb.append(Math.min(c1, c2)).append(' ').append(Math.max(c1, c2));
        else if (ok1) sb.append(c1);
        else if (ok2) sb.append(c2);
        else sb.append(-1);
        System.out.println(sb);
    }
}
