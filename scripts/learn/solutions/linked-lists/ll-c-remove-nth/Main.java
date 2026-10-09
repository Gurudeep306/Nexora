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

    public static void main(String[] args) throws IOException {
        int len = ni(), nth = ni();
        Node head = null, tail = null;
        for (int i = 0; i < len; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        // dummy head + gap n+1: second lands on the victim's predecessor
        Node dummy = new Node(0);
        dummy.next = head;
        Node first = dummy, second = dummy;
        for (int i = 0; i < nth + 1; i++) first = first.next;
        while (first != null) {
            first = first.next;
            second = second.next;
        }
        second.next = second.next.next;   // skip over the victim

        Node res = dummy.next;
        if (res == null) { System.out.println("EMPTY"); return; }
        StringBuilder sb = new StringBuilder();
        boolean firstOut = true;
        for (Node t = res; t != null; t = t.next) {
            if (!firstOut) sb.append(' ');
            firstOut = false;
            sb.append(t.v);
        }
        System.out.println(sb);
    }
}
