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
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            int p1 = ni(), a1 = ni(), b1 = ni(), p2 = ni(), a2 = ni(), b2 = ni();
            // lexicographic: the base dominates, then the power of n, then the power of log n
            int c = p1 != p2 ? Integer.compare(p1, p2) : a1 != a2 ? Integer.compare(a1, a2) : Integer.compare(b1, b2);
            sb.append(c < 0 ? '<' : c > 0 ? '>' : '=').append('\n');
        }
        System.out.print(sb);
    }
}
