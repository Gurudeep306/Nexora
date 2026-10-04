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
        int n = ni(), m = ni();
        long[] a = new long[n], D = new long[n + 1];
        for (int i = 0; i < n; i++) a[i] = nl();
        while (m-- > 0) {
            int l = ni(), r = ni();
            long v = nl();
            D[l] += v;            // the addition starts at l
            D[r + 1] -= v;        // ... and stops after r
        }
        long run = 0;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            run += D[i];
            sb.append(a[i] + run).append(i + 1 == n ? '\n' : ' ');
        }
        System.out.print(sb);
    }
}
