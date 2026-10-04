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
        int R = ni(), C = ni(), m = ni();
        long[][] M = new long[R][C], D = new long[R + 1][C + 1];
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++) M[i][j] = nl();
        while (m-- > 0) {
            int r1 = ni(), c1 = ni(), r2 = ni(), c2 = ni();
            long v = nl();
            D[r1][c1] += v;                      // four corner marks
            D[r1][c2 + 1] -= v;
            D[r2 + 1][c1] -= v;
            D[r2 + 1][c2 + 1] += v;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++) {
                if (i > 0) D[i][j] += D[i - 1][j];   // 2D prefix sum of the marks
                if (j > 0) D[i][j] += D[i][j - 1];
                if (i > 0 && j > 0) D[i][j] -= D[i - 1][j - 1];
                sb.append(M[i][j] + D[i][j]).append(j + 1 == C ? '\n' : ' ');
            }
        System.out.print(sb);
    }
}
