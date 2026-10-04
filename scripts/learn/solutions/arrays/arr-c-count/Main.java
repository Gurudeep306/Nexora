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
        int[] cnt = new int[101];
        for (int i = 0; i < n; i++) cnt[ni()]++;     // count every value once
        int q = ni();
        StringBuilder sb = new StringBuilder();
        while (q-- > 0) sb.append(cnt[ni()]).append('\n');
        System.out.print(sb);
    }
}
