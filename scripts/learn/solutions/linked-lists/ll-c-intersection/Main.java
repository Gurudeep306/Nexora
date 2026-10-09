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

    static Node[] readChain(int n) throws IOException {   // {head, tail}
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        return new Node[]{head, tail};
    }

    public static void main(String[] args) throws IOException {
        int na = ni(), nb = ni(), nc = ni();
        Node[] a = readChain(na);      // A's own part
        Node[] b = readChain(nb);      // B's own part
        Node[] c = readChain(nc);      // shared tail (SAME nodes for both lists)
        if (a[1] != null) a[1].next = c[0];   // A = own + shared
        if (b[1] != null) b[1].next = c[0];   // B = own + shared
        Node A = (a[0] != null) ? a[0] : c[0];  // A's full head (na = 0 -> shared head IS A)
        Node B = (b[0] != null) ? b[0] : c[0];

        // switch-partners walk: both routes reach the join after na + nb steps
        Node p = A, q = B;
        while (p != q) {
            p = (p != null) ? p.next : B;
            q = (q != null) ? q.next : A;
        }

        int ans = -1;
        if (p != null) {               // met on a real node: find its index along A
            ans = 0;
            for (Node t = A; t != p; t = t.next) ans++;
        }
        System.out.println(ans);
    }
}
