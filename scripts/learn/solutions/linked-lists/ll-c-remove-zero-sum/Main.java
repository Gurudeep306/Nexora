import java.io.*;
import java.util.HashMap;

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
        // Pass 1: store the LAST node reaching each prefix sum (64-bit sums).
        // Prefix 0 maps to the dummy, so a zero-sum prefix deletes from the head.
        HashMap<Long, Node> seen = new HashMap<>();
        long p = 0;
        seen.put(0L, dummy);
        for (Node t = dummy.next; t != null; t = t.next) {
            p += t.v;
            seen.put(p, t);           // LAST occurrence wins (overwrite)
        }
        // Pass 2: at each node with prefix p, jump over everything up to seen[p].
        p = 0;
        for (Node t = dummy; t != null; t = t.next) {
            p += t.v;                 // dummy contributes 0
            t.next = seen.get(p).next;
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
