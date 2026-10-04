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
        long best = a[0] + a[1] + a[2];
        for (int i = 0; i < n; i++) {
            int lo = i + 1, hi = n - 1;
            while (lo < hi) {
                long s = a[i] + a[lo] + a[hi];
                long d = Math.abs(s - T), bd = Math.abs(best - T);
                if (d < bd || (d == bd && s < best)) best = s;   // closer, or tie and smaller
                if (s < T) lo++;
                else if (s > T) hi--;
                else { System.out.println(s); return; }           // exact hit
            }
        }
        System.out.println(best);
    }
}
