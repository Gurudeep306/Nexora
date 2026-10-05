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

    static long powmod(long a, long b, long m) {
        long result = 1 % m, base = a % m;
        while (b > 0) {
            if ((b & 1) == 1) result = result * base % m;   // this bit of b is set
            base = base * base % m;                          // a^(2^k) for the next bit
            b >>= 1;
        }
        return result;
    }

    public static void main(String[] args) throws IOException {
        int Q = ni();
        StringBuilder sb = new StringBuilder();
        while (Q-- > 0) sb.append(powmod(nl(), nl(), nl())).append('\n');
        System.out.print(sb);
    }
}
