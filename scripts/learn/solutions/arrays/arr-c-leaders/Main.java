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
        long[] lead = new long[n];
        int cnt = 0;
        long mx = Long.MIN_VALUE;                 // max of everything to the right
        for (int i = n - 1; i >= 0; i--)
            if (a[i] > mx) { lead[cnt++] = a[i]; mx = a[i]; }
        StringBuilder sb = new StringBuilder();
        for (int k = cnt - 1; k >= 0; k--) sb.append(lead[k]).append(k == 0 ? '\n' : ' ');
        System.out.print(sb);
    }
}
