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
        long first = Long.MIN_VALUE, second = Long.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            long x = nl();
            if (x > first) { second = first; first = x; }
            else if (x > second) second = x;
        }
        int lg = 32 - Integer.numberOfLeadingZeros(n - 1);   // ceil(log2 n), exact
        System.out.println(second + " " + (n + lg - 2));
    }
}
