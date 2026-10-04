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
        long[] a = new long[n + 1];          // one spare slot for the new value
        for (int i = 0; i < n; i++) a[i] = nl();
        int p = ni();
        long x = nl();
        for (int i = n; i > p; i--) a[i] = a[i - 1];   // shift right, from the end
        a[p] = x;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i <= n; i++) sb.append(a[i]).append(i == n ? '\n' : ' ');
        System.out.print(sb);
    }
}
