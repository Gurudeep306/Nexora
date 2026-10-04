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
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        long cand = 0;
        int count = 0;
        for (long x : a) {                       // pair off different values
            if (count == 0) cand = x;
            count += (x == cand) ? 1 : -1;
        }
        int occ = 0;
        for (long x : a) if (x == cand) occ++;   // verify the survivor
        System.out.println(2L * occ > n ? cand : -1);
    }
}
