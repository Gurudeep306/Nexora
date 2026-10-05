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
        long W = nl();
        long[] w = new long[n];
        int[] v = new int[n];
        int V = 0;
        for (int i = 0; i < n; i++) { w[i] = nl(); v[i] = ni(); V += v[i]; }
        final long INF = Long.MAX_VALUE / 4;      // INF + w cannot overflow
        long[] mw = new long[V + 1];
        Arrays.fill(mw, INF);
        mw[0] = 0;
        for (int i = 0; i < n; i++)
            for (int t = V; t >= v[i]; t--)       // min weight for value exactly t
                mw[t] = Math.min(mw[t], mw[t - v[i]] + w[i]);
        int ans = V;
        while (mw[ans] > W) ans--;
        System.out.println(ans);
    }
}
