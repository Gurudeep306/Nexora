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
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) {
            long x = nl();
            int lo = 0, hi = n - 1, probes = 0;
            while (lo <= hi) {
                int mid = (lo + hi) >>> 1;
                probes++;                              // one read of a[mid]
                if (a[mid] == x) break;
                if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
            }
            sb.append(probes).append('\n');
        }
        System.out.print(sb);
    }
}
