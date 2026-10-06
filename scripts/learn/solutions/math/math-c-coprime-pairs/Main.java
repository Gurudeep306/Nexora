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

    public static void main(String[] args) throws IOException {
        final int N = 1000000;
        int[] phi = new int[N + 1];
        for (int v = 0; v <= N; v++) phi[v] = v;
        for (int p = 2; p <= N; p++)
            if (phi[p] == p)
                for (int j = p; j <= N; j += p) phi[j] -= phi[j] / p;
        long[] pre = new long[N + 1];
        for (int v = 1; v <= N; v++) pre[v] = pre[v - 1] + phi[v];
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) sb.append(2 * pre[ni()] - 1).append('\n');
        System.out.print(sb);
    }
}
