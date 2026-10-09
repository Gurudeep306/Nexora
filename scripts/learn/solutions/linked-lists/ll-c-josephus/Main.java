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

    public static void main(String[] args) throws IOException {
        int T = (int) nl();
        StringBuilder sb = new StringBuilder();
        while (T-- > 0) {
            int n = (int) nl();
            long k = nl();
            // O(n) recurrence: seat(1)=0; seat(m) = (seat(m-1)+k) mod m
            long seat = 0;
            for (int m = 2; m <= n; m++)
                seat = (seat + k) % m;
            sb.append(seat + 1).append('\n');   // 1-based survivor
        }
        System.out.print(sb);
    }
}
