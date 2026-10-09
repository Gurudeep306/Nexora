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
        Node dummy = new Node(0), tail = dummy;
        for (int i = 0; i < n; i++) {
            tail.next = new Node(ni());
            tail = tail.next;
        }
        return dummy.next;
    }

    public static void main(String[] args) throws IOException {
        int na = ni(), nb = ni();
        Node a = readList(na), b = readList(nb);

        // merge by relinking: dummy + tail pointer
        Node dummy = new Node(0), tail = dummy;
        while (a != null && b != null) {
            if (a.v <= b.v) { tail.next = a; a = a.next; }
            else            { tail.next = b; b = b.next; }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;   // attach remainder whole

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
