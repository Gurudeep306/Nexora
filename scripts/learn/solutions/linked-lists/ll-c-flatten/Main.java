import java.io.*;
import java.util.*;

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

    public static void main(String[] args) throws IOException {
        int n = ni();
        int[] v = new int[n], nxt = new int[n], chd = new int[n];
        for (int i = 0; i < n; i++) { v[i] = ni(); nxt[i] = ni(); chd[i] = ni(); }

        // iterative DFS: the stack holds RETURN POINTS — what recursion holds on frames
        int[] stk = new int[n + 1];
        int top = 0;
        StringBuilder sb = new StringBuilder();
        int cur = 0; // head is node 0
        while (cur != -1 || top > 0) {
            if (cur == -1) { cur = stk[--top]; continue; }
            if (sb.length() > 0) sb.append(' ');
            sb.append(v[cur]);                 // preorder: settle THIS node first
            if (chd[cur] != -1) {
                stk[top++] = nxt[cur];         // resume here AFTER the child subtree
                nxt[cur] = chd[cur];           // splice the child in (explicit relink)
                chd[cur] = -1;                 // detach: flattening destroys the hierarchy
            }
            cur = nxt[cur];                    // dive into child, or advance along the level
        }
        System.out.println(sb);
    }
}
