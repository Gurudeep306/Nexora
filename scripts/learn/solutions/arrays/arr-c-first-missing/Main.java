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
        for (int i = 0; i < n; i++)
            while (a[i] >= 1 && a[i] <= n && a[(int) a[i] - 1] != a[i]) {
                int h = (int) a[i] - 1;              // send a[i] to its home index
                long t = a[h]; a[h] = a[i]; a[i] = t;
            }
        int ans = n + 1;
        for (int i = 0; i < n; i++)
            if (a[i] != i + 1) { ans = i + 1; break; }
        System.out.println(ans);
    }
}
