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

    // The classic trick: given ONLY a pointer to the victim (never the tail),
    // copy the successor's value forward and bypass the successor.
    static void deleteNode(Node node) {
        node.v = node.next.v;    // steal the successor's contents
        node.next = node.next.next; // bypass it
    }

    public static void main(String[] args) throws IOException {
        int n = ni(), idx = ni();
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        // walk to position idx — in the interview you are HANDED this pointer
        Node node = head;
        for (int i = 0; i < idx; i++) node = node.next;

        deleteNode(node);

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
