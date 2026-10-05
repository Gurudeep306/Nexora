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
        final int I = 62, J = 40;                     // 2^61 > 1e18, 3^39 > 1e18
        long[][] v = new long[I + 1][J + 1], D = new long[I + 1][J + 1];
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            long n = nl();
            for (int i = 0; i <= I; i++)
                for (int j = 0; j <= J; j++)          // v[i][j] = floor(n / (2^i 3^j))
                    v[i][j] = (i == 0 && j == 0) ? n : (j > 0 ? v[i][j - 1] / 3 : v[i - 1][j] / 2);
            for (int i = I; i >= 0; i--)
                for (int j = J; j >= 0; j--)
                    D[i][j] = (v[i][j] == 0 || i == I || j == J) ? 0 : D[i + 1][j] + D[i][j + 1] + 1;
            sb.append(D[0][0]).append('\n');
        }
        System.out.print(sb);
    }
}
