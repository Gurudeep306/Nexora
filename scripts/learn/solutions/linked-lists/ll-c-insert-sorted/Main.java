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
        Node dummy = new Node(Long.MIN_VALUE); // -inf sentinel: new-head case falls out
        Node tail = dummy;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(nl());
            tail.next = nd;
            tail = nd;
        }
        // walk to the first node NOT <= x; splice before it (equals: x goes AFTER)
        Node prev = dummy;
        while (prev.next != null && prev.next.v <= x)
            prev = prev.next;
        Node nd = new Node(x);
        nd.next = prev.next;
        prev.next = nd;

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
