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
            long n = nl();
            sb.append(n * (n + 1) * (n + 2) / 6).append('\n');   // C(n+2, 3)
        }
        System.out.print(sb);
    }
}
