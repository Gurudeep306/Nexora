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
        int[] head = new int[n + 1], nxt = new int[n + 1];
        java.util.Arrays.fill(head, -1);
        for (int i = 2; i <= n; i++) {
            int p = ni();
            nxt[i] = head[p];                          // prepend i to p's child list
            head[p] = i;
        }
        int[] depth = new int[n + 1], stack = new int[n];
        int top = 0, best = 0;
        stack[top++] = 1;                              // explicit stack: no recursion
        while (top > 0) {
            int u = stack[--top];
            best = Math.max(best, depth[u]);
            for (int w = head[u]; w != -1; w = nxt[w]) {
                depth[w] = depth[u] + 1;
                stack[top++] = w;
            }
        }
        System.out.println(best);
    }
}
