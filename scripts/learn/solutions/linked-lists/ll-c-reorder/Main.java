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
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }

        if (head != null && head.next != null) {
            // Phase 1: middle (next-next guard: slow = last node of first half) + cut
            Node slow = head, fast = head;
            while (fast.next != null && fast.next.next != null) {
                slow = slow.next;
                fast = fast.next.next;
            }
            Node second = slow.next;
            slow.next = null;              // cut

            // Phase 2: reverse the second half — save before you sever
            Node prev = null, cur = second;
            while (cur != null) {
                Node nxt = cur.next;
                cur.next = prev;
                prev = cur;
                cur = nxt;
            }
            second = prev;

            // Phase 3: zip; the shorter-or-equal second chain drives the loop
            Node first = head;
            while (second != null) {
                Node t1 = first.next;
                Node t2 = second.next;     // save BOTH before any write
                first.next = second;
                second.next = t1;
                first = t1;
                second = t2;
            }
        }

        if (head == null) { System.out.println("EMPTY"); return; }
        StringBuilder sb = new StringBuilder();
        boolean firstOut = true;
        for (Node t = head; t != null; t = t.next) {
            if (!firstOut) sb.append(' ');
            firstOut = false;
            sb.append(t.v);
        }
        System.out.println(sb);
    }
}
