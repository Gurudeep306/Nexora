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
        int n = ni();
        long k = nl();
        long[] r = new long[n + 1];
        for (int i = 1; i <= n; i++) r[i] = Math.floorMod(r[i - 1] + nl(), k);
        Arrays.sort(r);
        long ans = 0;
        for (int i = 0, j; i <= n; i = j) {
            for (j = i; j <= n && r[j] == r[i]; j++) {}
            long c = j - i;
            ans += c * (c - 1) / 2;
        }
        System.out.println(ans);
    }
}
