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
        int t = ni();
        StringBuilder sb = new StringBuilder();
        while (t-- > 0) {
            long n = nl();
            StringBuilder line = new StringBuilder();
            for (long d = 2; d * d <= n; d++) {
                if (n % d != 0) continue;
                int e = 0;
                while (n % d == 0) { n /= d; e++; }
                line.append(d).append('^').append(e).append(' ');
            }
            if (n > 1) line.append(n).append("^1 ");
            sb.append(line.toString().trim()).append('\n');
        }
        System.out.print(sb);
    }
}
