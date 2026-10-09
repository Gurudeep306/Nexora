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
        int n = ni(), k = ni();
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        Node dummy = new Node(0);
        dummy.next = head;
        Node groupPrev = dummy;
        while (true) {
            // PROBE: is there a full group of k after groupPrev?
            Node probe = groupPrev;
            for (int i = 0; i < k && probe != null; i++) probe = probe.next;
            if (probe == null) break;               // partial group: leave as is
            Node groupHead = groupPrev.next;        // bookmark: becomes the group's tail
            Node prev = null, cur = groupHead;
            for (int i = 0; i < k; i++) {           // exactly k flips
                Node nxt = cur.next;
                cur.next = prev;
                prev = cur;
                cur = nxt;
            }
            groupPrev.next = prev;                  // front stitch
            groupHead.next = cur;                   // back stitch
            groupPrev = groupHead;                  // anchor -> this group's tail
        }

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
