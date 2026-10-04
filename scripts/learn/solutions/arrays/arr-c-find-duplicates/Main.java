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
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = ni();
        int[] dup = new int[n];
        int d = 0;
        for (int i = 0; i < n; i++) {
            int v = Math.abs(a[i]);              // the original value
            if (a[v - 1] < 0) dup[d++] = v;      // home slot already marked: seen before
            else a[v - 1] = -a[v - 1];           // mark v as seen
        }
        if (d == 0) { System.out.println(-1); return; }
        Arrays.sort(dup, 0, d);
        StringBuilder sb = new StringBuilder();
        for (int k = 0; k < d; k++) sb.append(dup[k]).append(k + 1 == d ? '\n' : ' ');
        System.out.print(sb);
    }
}
