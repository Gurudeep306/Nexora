import java.io.*;
import java.util.*;

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
    static final long M = 1000000007L;

    static long[][] mul(long[][] A, long[][] B) {
        int k = A.length;
        long[][] C = new long[k][k];
        for (int i = 0; i < k; i++)
            for (int t = 0; t < k; t++) {
                if (A[i][t] == 0) continue;
                for (int j = 0; j < k; j++) C[i][j] = (C[i][j] + A[i][t] * B[t][j]) % M;
            }
        return C;
    }

    public static void main(String[] args) throws IOException {
        int k = ni();
        long n = nl();
        long[] c = new long[k], a = new long[k];
        for (int i = 0; i < k; i++) c[i] = nl();
        for (int i = 0; i < k; i++) a[i] = nl();
        if (n < k) { System.out.println(a[(int) n]); return; }
        long[][] C = new long[k][k], R = new long[k][k];
        for (int j = 0; j < k; j++) C[0][j] = c[j];
        for (int i = 1; i < k; i++) C[i][i - 1] = 1;
        for (int i = 0; i < k; i++) R[i][i] = 1;
        for (long e = n - k + 1; e > 0; e >>= 1) {
            if ((e & 1) == 1) R = mul(R, C);
            C = mul(C, C);
        }
        long ans = 0;
        for (int j = 0; j < k; j++) ans = (ans + R[0][j] * a[k - 1 - j]) % M;
        System.out.println(ans);
    }
}
