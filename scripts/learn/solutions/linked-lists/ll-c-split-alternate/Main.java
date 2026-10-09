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

    static String render(Node head) {
        if (head == null) return "EMPTY";
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Node t = head; t != null; t = t.next) {
            if (!first) sb.append(' ');
            first = false;
            sb.append(t.v);
        }
        return sb.toString();
    }

    public static void main(String[] args) throws IOException {
        int n = ni();
        Node head = null, inTail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else inTail.next = nd;
            inTail = nd;
        }
        // thread two chains in one walk
        Node dA = new Node(0), dB = new Node(0);
        Node tA = dA, tB = dB;
        Node cur = head;
        boolean toA = true;
        while (cur != null) {
            Node nxt = cur.next;    // save BEFORE threading rewrites cur.next
            if (toA) { tA.next = cur; tA = cur; }
            else     { tB.next = cur; tB = cur; }
            toA = !toA;
            cur = nxt;
        }
        tA.next = null;             // SEAL both tails
        tB.next = null;

        StringBuilder out = new StringBuilder();
        out.append(render(dA.next)).append('\n').append(render(dB.next));
        System.out.println(out);
    }
}
