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
        long T = nl();
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        Arrays.sort(a);
        long count = 0;
        for (int i = 0; i < n; i++) {
            if (i > 0 && a[i] == a[i - 1]) continue;
            for (int j = i + 1; j < n; j++) {
                if (j > i + 1 && a[j] == a[j - 1]) continue;
                int lo = j + 1, hi = n - 1;
                while (lo < hi) {
                    long s = a[i] + a[j] + a[lo] + a[hi];       // long: up to 4e9
                    if (s < T) lo++;
                    else if (s > T) hi--;
                    else {
                        count++;
                        lo++;
                        while (lo < hi && a[lo] == a[lo - 1]) lo++;
                        hi--;
                    }
                }
            }
        }
        System.out.println(count);
    }
}
