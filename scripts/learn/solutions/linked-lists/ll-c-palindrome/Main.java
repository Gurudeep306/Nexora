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

    static Node reverseList(Node head) {
        Node prev = null, cur = head;
        while (cur != null) {
            Node nxt = cur.next;
            cur.next = prev;
            prev = cur;
            cur = nxt;
        }
        return prev;
    }

    public static void main(String[] args) throws IOException {
        int n = ni();
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }

        boolean ok = true;
        if (head != null) {
            // split: next-next guard leaves slow at the LAST node of the first half
            Node slow = head, fast = head;
            while (fast.next != null && fast.next.next != null) {
                slow = slow.next;
                fast = fast.next.next;
            }
            Node secondHead = slow.next;   // floor(n/2) nodes AFTER slow
            slow.next = null;              // cut
            secondHead = reverseList(secondHead);

            Node p = head;
            for (Node q = secondHead; q != null; q = q.next, p = p.next) {
                if (p.v != q.v) { ok = false; break; }
            }

            slow.next = reverseList(secondHead);   // RESTORE on both exits
        }
        System.out.println(ok ? 1 : 0);
    }
}
