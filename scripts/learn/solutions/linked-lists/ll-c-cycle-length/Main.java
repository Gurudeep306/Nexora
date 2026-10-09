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
        int n = ni(), pos = ni();
        Node[] nodes = new Node[n];
        Node head = null;
        for (int i = 0; i < n; i++) {
            nodes[i] = new Node(ni());
            if (i > 0) nodes[i - 1].next = nodes[i]; else head = nodes[i];
        }
        if (n > 0 && pos >= 0) nodes[n - 1].next = nodes[pos];   // build the cycle

        // Act 1: Floyd detect — tortoise 1, hare 2
        Node slow = head, fast = head;
        boolean met = false;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) { met = true; break; }
        }
        if (!met) { System.out.println(0); return; }

        // Act 2: freeze slow, walk p around one full lap
        Node p = slow.next;
        int C = 1;
        while (p != slow) {
            p = p.next;
            C++;
        }
        System.out.println(C);
    }
}
