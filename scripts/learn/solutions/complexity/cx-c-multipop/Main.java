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
        int q = ni();
        long[] st = new long[q];
        int top = 0;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < q; i++) {
            int t = ni();
            long x = nl();
            if (t == 1) { st[top++] = x; continue; }
            long sum = 0;
            long m = Math.min(x, top);                // each element is popped at most once overall
            while (m-- > 0) sum += st[--top];
            sb.append(sum).append('\n');
        }
        System.out.print(sb);
    }
}
