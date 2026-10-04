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
        HashMap<Long, Integer> first = new HashMap<>(4 * n + 4);
        first.put(0L, 0);                        // prefix 0 before the first element
        long p = 0;
        int best = 0;
        for (int j = 1; j <= n; j++) {
            p += nl();
            Integer i = first.get(p - k);
            if (i != null) best = Math.max(best, j - i);
            first.putIfAbsent(p, j);             // keep the earliest position
        }
        System.out.println(best);
    }
}
