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
        int n = ni(), m = ni();
        long[] A = new long[n], B = new long[m];
        for (int k = 0; k < n; k++) A[k] = nl();
        for (int k = 0; k < m; k++) B[k] = nl();
        StringBuilder sb = new StringBuilder();
        int i = 0, j = 0;
        while (i < n && j < m) sb.append(A[i] <= B[j] ? A[i++] : B[j++]).append(' ');   // ties: A first
        while (i < n) sb.append(A[i++]).append(' ');
        while (j < m) sb.append(B[j++]).append(' ');
        sb.setLength(sb.length() - 1);
        System.out.println(sb);
    }
}
