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
        long L = nl(), R = nl();
        int lim = (int) Math.sqrt((double) R);
        while ((long) lim * lim > R) lim--;
        while ((long) (lim + 1) * (lim + 1) <= R) lim++;
        boolean[] comp = new boolean[lim + 1];
        int[] primes = new int[lim + 1];
        int np = 0;
        for (int p = 2; p <= lim; p++) {
            if (comp[p]) continue;
            primes[np++] = p;
            for (long j = (long) p * p; j <= lim; j += p) comp[(int) j] = true;
        }
        int size = (int) (R - L + 1);
        boolean[] cross = new boolean[size];          // cross[i] <-> L + i
        for (int i = 0; i < np; i++) {
            long p = primes[i];
            long s = Math.max(p * p, (L + p - 1) / p * p);
            for (long j = s; j <= R; j += p) cross[(int) (j - L)] = true;
        }
        if (L == 1) cross[0] = true;
        int cnt = 0;
        for (int i = 0; i < size; i++) if (!cross[i]) cnt++;
        System.out.println(cnt);
    }
}
