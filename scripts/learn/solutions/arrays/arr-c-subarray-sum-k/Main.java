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
        HashMap<Long, Integer> seen = new HashMap<>(4 * n + 4);
        seen.put(0L, 1);                         // the empty prefix
        long p = 0, count = 0;
        for (int i = 0; i < n; i++) {
            p += nl();
            count += seen.getOrDefault(p - k, 0);   // earlier prefixes P with p - P = k
            seen.merge(p, 1, Integer::sum);
        }
        System.out.println(count);
    }
}
