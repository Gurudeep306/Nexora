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
        Node dummy = new Node(0);
        Node tail = dummy;
        for (int i = 0; i < n; i++) {
            tail.next = new Node(ni());
            tail = tail.next;
        }
        Node anchor = dummy;
        boolean doReverse = true;
        while (anchor.next != null) {
            // PROBE: count min(k, remaining) nodes of this group
            Node probe = anchor.next;
            int cnt = 1;
            while (cnt < k && probe.next != null) { probe = probe.next; cnt++; }
            if (doReverse) {
                Node groupHead = anchor.next;
                Node after = probe.next;      // first node past the group
                Node prev = after;            // seed: tail links onward directly
                Node cur = groupHead;
                while (cur != after) {
                    Node nxt = cur.next;
                    cur.next = prev;
                    prev = cur;
                    cur = nxt;
                }
                anchor.next = prev;           // prev == probe: group's new head
                anchor = groupHead;           // original head is now the group's TAIL
            } else {
                anchor = probe;               // skipped group's LAST node
            }
            doReverse = !doReverse;
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
