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
        int n = ni(), k = ni();
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nl();
        int[] dq = new int[n];                       // deque of indices in an array
        int head = 0, tail = 0;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            while (tail > head && a[dq[tail - 1]] <= a[i]) tail--;   // dominated forever
            dq[tail++] = i;
            if (dq[head] <= i - k) head++;                           // slid out of the window
            if (i >= k - 1) sb.append(a[dq[head]]).append(i + 1 == n ? '\n' : ' ');
        }
        System.out.print(sb);
    }
}
