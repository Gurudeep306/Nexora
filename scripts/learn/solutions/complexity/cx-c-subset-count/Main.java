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
        long T = nl();
        long[] sums = new long[1 << n];
        int k = 1;                                    // sums[0] = 0: the empty subset
        for (int i = 0; i < n; i++) {
            long x = nl();
            for (int j = 0; j < k; j++) sums[k + j] = sums[j] + x;   // subsets that take x
            k *= 2;
        }
        long cnt = 0;
        for (long s : sums) if (s == T) cnt++;
        System.out.println(cnt);
    }
}
