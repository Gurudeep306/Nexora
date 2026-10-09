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

    public static void main(String[] args) throws IOException {
        int T = (int) nl();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long n = nl();
            // closed form for k=2: n = 2^m + l (0 <= l < 2^m) -> survivor 2l+1
            long p = Long.highestOneBit(n);   // largest power of two <= n
            long l = n - p;
            sb.append(2 * l + 1).append('\n');
        }
        System.out.print(sb);
    }
}
