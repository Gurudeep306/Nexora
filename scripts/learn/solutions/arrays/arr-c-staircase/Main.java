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
        int R = ni(), C = ni();
        long[][] M = new long[R][C];
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++) M[i][j] = nl();
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) {
            long x = nl();
            int i = 0, j = C - 1;                   // top-right corner
            boolean found = false;
            while (i < R && j >= 0) {
                if (M[i][j] == x) { found = true; break; }
                if (M[i][j] > x) j--;               // the whole column is too big
                else i++;                           // the whole row is too small
            }
            sb.append(found ? "YES\n" : "NO\n");
        }
        System.out.print(sb);
    }
}
