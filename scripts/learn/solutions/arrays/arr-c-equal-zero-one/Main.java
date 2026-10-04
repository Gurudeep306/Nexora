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
        int[] first = new int[2 * n + 1];        // prefix value v stored at v + n
        Arrays.fill(first, -1);
        first[n] = 0;
        int p = 0, best = 0;
        for (int j = 1; j <= n; j++) {
            p += (ni() == 1 ? 1 : -1);           // count a 0 as -1
            if (first[p + n] >= 0) best = Math.max(best, j - first[p + n]);
            else first[p + n] = j;
        }
        System.out.println(best);
    }
}
