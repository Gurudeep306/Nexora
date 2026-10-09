import java.io.*;

public class Main {
    static class Node { long c; int e; Node next; Node(long c, int e) { this.c = c; this.e = e; } }

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
    static long nl() throws IOException {
        int r = in.read();
        while (r != '-' && (r < '0' || r > '9')) r = in.read();
        boolean neg = r == '-';
        if (neg) r = in.read();
        long x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = in.read(); }
        return neg ? -x : x;
    }

    static Node readPoly(int n) throws IOException {
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(nl(), ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        return head;
    }

    public static void main(String[] args) throws IOException {
        int na = ni(), nb = ni();
        Node a = readPoly(na);
        Node b = readPoly(nb);
        // merge-walk on DESCENDING exponents; tie -> sum, drop if zero
        Node dummy = new Node(0, 0);
        Node tail = dummy;
        while (a != null && b != null) {
            if (a.e > b.e) { tail.next = new Node(a.c, a.e); tail = tail.next; a = a.next; }
            else if (b.e > a.e) { tail.next = new Node(b.c, b.e); tail = tail.next; b = b.next; }
            else {
                long s = a.c + b.c;
                if (s != 0) { tail.next = new Node(s, a.e); tail = tail.next; }  // cancel-and-drop
                a = a.next;
                b = b.next;
            }
        }
        while (a != null) { tail.next = new Node(a.c, a.e); tail = tail.next; a = a.next; }
        while (b != null) { tail.next = new Node(b.c, b.e); tail = tail.next; b = b.next; }

        if (dummy.next == null) { System.out.println("EMPTY"); return; }
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Node t = dummy.next; t != null; t = t.next) {
            if (!first) sb.append(' ');
            first = false;
            sb.append(t.c).append(' ').append(t.e);
        }
        System.out.println(sb);
    }
}
