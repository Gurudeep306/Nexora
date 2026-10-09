import java.io.*;

public class Main {
    // Cursor inside a DOUBLY linked list: back/forward are prev/next hops,
    // and visit-unlinks-forward is O(1) with prev+next in hand.
    static class Node { String url; Node prev, next; Node(String url) { this.url = url; } }

    static DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));

    static String nextWord() throws IOException {
        StringBuilder sb = new StringBuilder();
        int r = in.read();
        while (r <= 32 && r != -1) r = in.read();
        while (r > 32 && r != -1) { sb.append((char) r); r = in.read(); }
        return sb.toString();
    }

    static int ni() throws IOException {
        int r = in.read();
        while (r < '0' || r > '9') r = in.read();
        int x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = in.read(); }
        return x;
    }

    public static void main(String[] args) throws IOException {
        Node cur = new Node(nextWord());
        int q = ni();
        StringBuilder sb = new StringBuilder();
        for (int t = 0; t < q; t++) {
            String op = nextWord();
            if (op.charAt(0) == 'v') {          // visit url
                Node nd = new Node(nextWord());
                nd.prev = cur;
                cur.next = nd;                  // forward history is simply dropped
                cur = nd;                       // (unreachable, no unlinking needed)
            } else if (op.charAt(0) == 'b') {   // back k
                int k = ni();
                while (k-- > 0 && cur.prev != null) cur = cur.prev;
                sb.append(cur.url).append('\n');
            } else {                            // forward k
                int k = ni();
                while (k-- > 0 && cur.next != null) cur = cur.next;
                sb.append(cur.url).append('\n');
            }
        }
        System.out.print(sb);
    }
}
