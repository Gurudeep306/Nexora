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
        long[][] a = new long[R][C];
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++) a[i][j] = nl();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < C; i++)              // output row i = input column i
            for (int j = 0; j < R; j++) sb.append(a[j][i]).append(j + 1 == R ? '\n' : ' ');
        System.out.print(sb);
    }
}
