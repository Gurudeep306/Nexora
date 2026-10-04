import java.io.*;

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

    static int n;
    static int[] a;

    static long atMost(int K) {                   // subarrays with at most K odd numbers
        long total = 0;
        int lo = 0, odd = 0;
        for (int hi = 0; hi < n; hi++) {
            odd += a[hi] & 1;
            while (odd > K) odd -= a[lo++] & 1;
            total += hi - lo + 1;                 // every start in [lo, hi]
        }
        return total;
    }

    public static void main(String[] args) throws IOException {
        n = ni();
        int k = ni();
        a = new int[n];
        for (int i = 0; i < n; i++) a[i] = ni();
        System.out.println(atMost(k) - atMost(k - 1));
    }
}
