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
        boolean row0 = false, col0 = false;
        for (int j = 0; j < C; j++) if (M[0][j] == 0) row0 = true;
        for (int i = 0; i < R; i++) if (M[i][0] == 0) col0 = true;
        for (int i = 1; i < R; i++)
            for (int j = 1; j < C; j++)
                if (M[i][j] == 0) { M[i][0] = 0; M[0][j] = 0; }   // flags in row 0 / column 0
        for (int i = 1; i < R; i++)
            for (int j = 1; j < C; j++)
                if (M[i][0] == 0 || M[0][j] == 0) M[i][j] = 0;
        if (row0) for (int j = 0; j < C; j++) M[0][j] = 0;        // the flag row/column last
        if (col0) for (int i = 0; i < R; i++) M[i][0] = 0;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++) sb.append(M[i][j]).append(j + 1 == C ? '\n' : ' ');
        System.out.print(sb);
    }
}
