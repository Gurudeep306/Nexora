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
        final int N = 5000000;
        boolean[] comp = new boolean[N + 1];
        comp[0] = comp[1] = true;
        for (long p = 2; p * p <= N; p++)
            if (!comp[(int) p])
                for (long j = p * p; j <= N; j += p) comp[(int) j] = true;
        int[] pi = new int[N + 1];
        for (int v = 1; v <= N; v++) pi[v] = pi[v - 1] + (comp[v] ? 0 : 1);
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) sb.append(pi[ni()]).append('\n');
        System.out.print(sb);
    }
}
