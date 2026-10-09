import java.io.*;

public class Main {
    static class Node { int v; Node next; Node(int v) { this.v = v; } }

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
        Node head = null, inTail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else inTail.next = nd;
            inTail = nd;
        }
        // thread three dummy-headed chains in one walk
        Node[] d = { new Node(0), new Node(0), new Node(0) };
        Node[] t = { d[0], d[1], d[2] };
        Node cur = head;
        while (cur != null) {
            Node nxt = cur.next;   // save: cur is about to leave the input
            int b = cur.v;
            t[b].next = cur;       // route to its chain's tail
            t[b] = cur;
            cur = nxt;
        }
        t[2].next = null;          // SEAL the last tail
        // concatenate the non-empty chains 0 -> 1 -> 2
        Node res = null, resTail = null;
        for (int b = 0; b < 3; b++) {
            if (d[b].next == null) continue;
            if (res == null) res = d[b].next;
            else resTail.next = d[b].next;
            resTail = t[b];
        }
        if (res == null) { System.out.println("EMPTY"); return; }
        resTail.next = null;       // belt-and-braces seal on the true last chain
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Node x = res; x != null; x = x.next) {
            if (!first) sb.append(' ');
            first = false;
            sb.append(x.v);
        }
        System.out.println(sb);
    }
}
