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
        int N = ni();
        long[][] a = new long[N][N];
        for (int i = 0; i < N; i++)
            for (int j = 0; j < N; j++) a[i][j] = nl();
        for (int i = 0; i < N; i++)                                // transpose
            for (int j = i + 1; j < N; j++) { long t = a[i][j]; a[i][j] = a[j][i]; a[j][i] = t; }
        for (long[] row : a)                                       // mirror each row
            for (int l = 0, r = N - 1; l < r; l++, r--) { long t = row[l]; row[l] = row[r]; row[r] = t; }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < N; i++)
            for (int j = 0; j < N; j++) sb.append(a[i][j]).append(j + 1 == N ? '\n' : ' ');
        System.out.print(sb);
    }
}
