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

    static Node readList(int n) throws IOException {
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        return head;
    }

    public static void main(String[] args) throws IOException {
        int na = ni(), nb = ni();
        Node a = readList(na);
        Node b = readList(nb);
        // merge-walk with dedup against the RESULT tail
        Node dummy = new Node(0);
        Node tail = dummy;
        boolean any = false;
        while (a != null && b != null) {
            int v;
            if (a.v <= b.v) { v = a.v; a = a.next; }
            else            { v = b.v; b = b.next; }
            if (any && tail.v == v) continue;   // dedup vs result tail
            tail.next = new Node(v);
            tail = tail.next;
            any = true;
        }
        while (a != null) {
            int v = a.v; a = a.next;
            if (any && tail.v == v) continue;
            tail.next = new Node(v); tail = tail.next; any = true;
        }
        while (b != null) {
            int v = b.v; b = b.next;
            if (any && tail.v == v) continue;
            tail.next = new Node(v); tail = tail.next; any = true;
        }

        if (dummy.next == null) { System.out.println("EMPTY"); return; }
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
