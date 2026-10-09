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
        int n = ni(), m = ni(), k = ni();
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        // dummy head absorbs m == 1
        Node dummy = new Node(0);
        dummy.next = head;
        Node anchor = dummy;
        for (int i = 1; i < m; i++) anchor = anchor.next;   // position m-1
        Node rangeHead = anchor.next;                        // bookmark BEFORE flipping
        Node prev = null, cur = rangeHead;
        for (int i = 0; i < k - m + 1; i++) {                // exactly k-m+1 flips
            Node nxt = cur.next;
            cur.next = prev;
            prev = cur;
            cur = nxt;
        }
        anchor.next = prev;        // front stitch
        rangeHead.next = cur;      // back stitch

        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Node t = dummy.next; t != null; t = t.next) {
            if (!first) sb.append(' ');
            first = false;
            sb.append(t.v);
        }
        System.out.println(sb);
    }
}
