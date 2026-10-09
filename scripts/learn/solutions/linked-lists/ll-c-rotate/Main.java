import java.io.*;

public class Main {
    static class Node { int v; Node next; Node(int v) { this.v = v; } }

    static DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));
    static long nl() throws IOException {
        int r = in.read();
        while (r != '-' && (r < '0' || r > '9')) r = in.read();
        boolean neg = r == '-';
        if (neg) r = in.read();
        long x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = in.read(); }
        return neg ? -x : x;
    }

    public static void main(String[] args) throws IOException {
        int n = (int) nl();
        long k = nl();                 // k up to 1e9 — keep it 64-bit until reduced
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node((int) nl());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }

        // close-the-ring walk
        if (head != null && n > 0) {
            k %= n;                    // rotating by n is a no-op
            if (k != 0) {
                tail.next = head;      // close the ring
                Node newTail = head;
                for (long i = 0; i < n - k - 1; i++) newTail = newTail.next;
                head = newTail.next;   // old next is the new head
                newTail.next = null;   // cut
            }
        }

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
