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

    static void rev(long[] a, int i, int j) {   // reverse a[i..j]
        for (; i < j; i++, j--) { long t = a[i]; a[i] = a[j]; a[j] = t; }
    }

    public static void main(String[] args) throws IOException {
        int n = ni();
        long k = nl();
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        int r = (int) (k % n);                 // only k mod n matters
        rev(a, 0, n - 1);
        rev(a, 0, r - 1);
        rev(a, r, n - 1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(a[i]).append(i + 1 == n ? '\n' : ' ');
        System.out.print(sb);
    }
}
