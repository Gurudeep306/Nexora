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
        int w = 1;                              // a[0..w-1] = distinct values so far
        for (int r = 1; r < n; r++)
            if (a[r] != a[w - 1]) a[w++] = a[r];
        StringBuilder sb = new StringBuilder().append(w).append('\n');
        for (int i = 0; i < w; i++) sb.append(a[i]).append(i + 1 == w ? '\n' : ' ');
        System.out.print(sb);
    }
}
