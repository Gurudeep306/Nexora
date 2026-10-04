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
        int R = ni(), C = ni();
        long[][] a = new long[R][C];
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++) a[i][j] = nl();
        StringBuilder sb = new StringBuilder();
        int top = 0, bottom = R - 1, left = 0, right = C - 1;
        while (top <= bottom && left <= right) {
            for (int j = left; j <= right; j++) sb.append(a[top][j]).append(' ');
            top++;
            for (int i = top; i <= bottom; i++) sb.append(a[i][right]).append(' ');
            right--;
            if (top <= bottom) {                   // a bottom row is left
                for (int j = right; j >= left; j--) sb.append(a[bottom][j]).append(' ');
                bottom--;
            }
            if (left <= right) {                   // a left column is left
                for (int i = bottom; i >= top; i--) sb.append(a[i][left]).append(' ');
                left++;
            }
        }
        sb.setLength(sb.length() - 1);
        System.out.println(sb);
    }
}
