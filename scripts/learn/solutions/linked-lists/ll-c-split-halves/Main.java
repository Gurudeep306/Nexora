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

    static void emit(Node h, StringBuilder sb) {
        if (h == null) { sb.append("EMPTY\n"); return; }
        boolean first = true;
        for (Node t = h; t != null; t = t.next) {
            if (!first) sb.append(' ');
            first = false;
            sb.append(t.v);
        }
        sb.append('\n');
    }

    public static void main(String[] args) throws IOException {
        int n = ni();
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        // split convention: slow=head, fast=head.next, while(fast && fast.next)
        Node slow = head;
        Node fast = head != null ? head.next : null;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        Node second = slow.next;
        slow.next = null;              // THE CUT

        StringBuilder sb = new StringBuilder();
        emit(head, sb);
        emit(second, sb);
        System.out.print(sb);
    }
}
