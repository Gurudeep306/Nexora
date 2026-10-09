import java.io.*;
import java.util.*;

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
        int n = ni();
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }

        // seen-set + dummy-headed prev-walk: unlink repeats, keep first occurrences
        HashSet<Integer> seen = new HashSet<>();
        Node dummy = new Node(0);
        dummy.next = head;
        Node prev = dummy;
        while (prev.next != null) {
            Node cur = prev.next;
            if (seen.contains(cur.v)) {
                prev.next = cur.next;   // unlink; prev stays
            } else {
                seen.add(cur.v);
                prev = cur;             // keep: cur becomes the new anchor
            }
        }

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
