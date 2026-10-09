import java.io.*;

public class Main {
    static DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));
    static int ni() throws IOException {
        int r = in.read();
        while (r != '-' && (r < '0' || r > '9')) r = in.read();
        boolean neg = r == '-';
        if (neg) r = in.read();
        int x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = in.read(); }
        return neg ? -x : x;
    }

    static int f(int x) {             // sum of squares of digits
        int s = 0;
        while (x > 0) { int d = x % 10; s += d * d; x /= 10; }
        return s;
    }

    public static void main(String[] args) throws IOException {
        int T = ni();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            int x = ni();
            // Floyd on the implicit digit-square chain
            int slow = x;
            int fast = f(x);
            while (fast != 1 && slow != fast) {
                slow = f(slow);
                fast = f(f(fast));
            }
            sb.append(fast == 1 ? '1' : '0').append('\n');
        }
        System.out.print(sb);
    }
}
