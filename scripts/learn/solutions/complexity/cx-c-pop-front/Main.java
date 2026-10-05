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
        int[] a = new int[q];
        int head = 0, tail = 0;                   // live queue is a[head..tail)
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) {
            if (ni() == 1) a[tail++] = ni();
            else sb.append(a[head++]).append('\n');   // O(1): nothing moves
        }
        System.out.print(sb);
    }
}
