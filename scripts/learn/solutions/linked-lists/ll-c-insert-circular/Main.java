import java.io.*;

public class Main {
    static class Node { long v; Node next; Node(long v) { this.v = v; } }

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
        long x = nl();
        Node H = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(nl());
            if (H == null) H = nd; else tail.next = nd;
            tail = nd;
        }
        if (H == null) {                       // empty ring: x alone
            System.out.println(x);
            return;
        }
        tail.next = H;                         // close the ring

        // One lap from H, examining pairs (a, b) INCLUDING the wrap pair (last, H).
        // Insert into the FIRST qualifying pair: a <= x <= b, or the seam (a > b)
        // with x >= a or x <= b. No pair qualifies (all equal) -> insert after H.
        Node nd = new Node(x);
        Node a = H;
        boolean done = false;
        for (int step = 0; step < n && !done; step++) {
            Node b = a.next;
            boolean seam = a.v > b.v;
            if ((a.v <= x && x <= b.v) || (seam && (x >= a.v || x <= b.v))) {
                nd.next = b;
                a.next = nd;
                done = true;
            }
            a = b;
        }
        if (!done) {                           // all values equal: insert after H
            nd.next = H.next;
            H.next = nd;
        }

        StringBuilder sb = new StringBuilder();
        Node t = H;
        for (int i = 0; i < n + 1; i++) {
            if (i > 0) sb.append(' ');
            sb.append(t.v);
            t = t.next;
        }
        System.out.println(sb);
    }
}
