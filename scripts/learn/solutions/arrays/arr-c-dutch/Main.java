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
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = ni();
        int lo = 0, mid = 0, hi = n - 1;          // [0,lo)=0  [lo,mid)=1  [mid,hi]=?  (hi,n)=2
        while (mid <= hi) {
            if (a[mid] == 0) { int t = a[lo]; a[lo++] = a[mid]; a[mid++] = t; }
            else if (a[mid] == 1) mid++;
            else { int t = a[hi]; a[hi--] = a[mid]; a[mid] = t; }   // a[mid] still unknown
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(a[i]).append(i + 1 == n ? '\n' : ' ');
        System.out.print(sb);
    }
}
