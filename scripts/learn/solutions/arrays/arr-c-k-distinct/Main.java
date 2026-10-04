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
        int n = ni(), k = ni();
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        // compress values to 0..n-1 so counts fit in an array
        long[] sorted = a.clone();
        Arrays.sort(sorted);
        int[] id = new int[n];
        for (int i = 0; i < n; i++) id[i] = Arrays.binarySearch(sorted, a[i]);
        int[] cnt = new int[n];
        int lo = 0, distinct = 0, best = 0;
        for (int hi = 0; hi < n; hi++) {
            if (cnt[id[hi]]++ == 0) distinct++;     // a new value entered the window
            while (distinct > k)
                if (--cnt[id[lo++]] == 0) distinct--;   // a value left completely
            best = Math.max(best, hi - lo + 1);
        }
        System.out.println(best);
    }
}
