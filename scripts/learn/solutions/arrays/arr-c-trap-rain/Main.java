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

    public static void main(String[] args) throws IOException {
        int n = ni();
        long[] h = new long[n];
        for (int k = 0; k < n; k++) h[k] = nl();
        int i = 0, j = n - 1;
        long lmax = 0, rmax = 0, water = 0;
        while (i <= j) {
            if (lmax <= rmax) {                   // the left side's level is already certain
                lmax = Math.max(lmax, h[i]);
                water += lmax - h[i++];
            } else {
                rmax = Math.max(rmax, h[j]);
                water += rmax - h[j--];
            }
        }
        System.out.println(water);
    }
}
