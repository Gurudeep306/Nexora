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
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            int d = ni(), top = -1;
            for (int i = 0; i <= d; i++) {        // coefficient i belongs to n^(d - i)
                long c = nl();
                if (c != 0 && top < 0) top = d - i;
            }
            sb.append(top == 0 ? "Theta(1)" : top == 1 ? "Theta(n)" : "Theta(n^" + top + ")").append('\n');
        }
        System.out.print(sb);
    }
}
