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

    static Node readList(int n) throws IOException {
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(ni());
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        return head;
    }

    static Node rev(Node head) { // save before you sever
        Node prev = null, cur = head;
        while (cur != null) {
            Node nxt = cur.next;
            cur.next = prev;
            prev = cur;
            cur = nxt;
        }
        return prev;
    }

    public static void main(String[] args) throws IOException {
        int na = ni(), nb = ni();
        Node headA = readList(na);
        Node headB = readList(nb);
        // reverse both, stream the carry, reverse the result — all iterative
        Node a = rev(headA);
        Node b = rev(headB);
        int carry = 0;
        Node dummy = new Node(0);
        Node tail = dummy;
        while (a != null || b != null || carry != 0) {
            int sum = carry;
            if (a != null) { sum += a.v; a = a.next; }
            if (b != null) { sum += b.v; b = b.next; }
            carry = sum / 10;
            tail.next = new Node(sum % 10);
            tail = tail.next;
        }
        Node res = rev(dummy.next);
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Node t = res; t != null; t = t.next) {
            if (!first) sb.append(' ');
            first = false;
            sb.append(t.v);
        }
        System.out.println(sb);
    }
}
