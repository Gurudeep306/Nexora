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
        Node dummy = new Node(0);
        Node tail = dummy;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            tail.next = nd;
            tail = nd;
        }
        // dummy head (the head itself can be a victim); prev never enters a run.
        Node prev = dummy;
        while (prev.next != null && prev.next.next != null) {
            if (prev.next.v == prev.next.next.v) {
                int dup = prev.next.v;                 // remember the run's value
                while (prev.next != null && prev.next.v == dup) {
                    prev.next = prev.next.next;        // unlink the WHOLE run
                }
                // prev stays put: the new prev.next is unexamined
            } else {
                prev = prev.next;                      // unique so far, keep it
            }
        }
        Node head = dummy.next;
        if (head == null) { System.out.println("EMPTY"); return; }
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Node t = head; t != null; t = t.next) {
            if (!first) sb.append(' ');
            first = false;
            sb.append(t.v);
        }
        System.out.println(sb);
    }
}
