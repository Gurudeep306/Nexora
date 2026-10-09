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
        int n = ni(), x = ni();
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }

        // two dummy-headed chains: < x and >= x, appended in arrival order (stable)
        Node lessD = new Node(0), geqD = new Node(0);
        Node less = lessD, geq = geqD;
        for (Node cur = head; cur != null; cur = cur.next) {
            if (cur.v < x) { less.next = cur; less = cur; }
            else           { geq.next = cur; geq = cur; }
        }
        geq.next = null;          // SEAL the right chain
        less.next = geqD.next;    // concatenate: one write

        if (lessD.next == null) { System.out.println("EMPTY"); return; }
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Node t = lessD.next; t != null; t = t.next) {
            if (!first) sb.append(' ');
            first = false;
            sb.append(t.v);
        }
        System.out.println(sb);
    }
}
