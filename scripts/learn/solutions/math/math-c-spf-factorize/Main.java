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
        int[] spf = new int[N + 1];
        for (int p = 2; p <= N; p++) {
            if (spf[p] != 0) continue;
            spf[p] = p;
            for (long j = (long) p * p; j <= N; j += p)
                if (spf[(int) j] == 0) spf[(int) j] = p;
        }
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) {
            int x = ni();
            boolean first = true;
            while (x > 1) {
                if (!first) sb.append(' ');
                first = false;
                sb.append(spf[x]);
                x /= spf[x];
            }
            sb.append('\n');
        }
        System.out.print(sb);
    }
}
