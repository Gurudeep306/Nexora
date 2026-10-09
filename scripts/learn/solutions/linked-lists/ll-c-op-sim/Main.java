import java.io.*;

public class Main {
    // Doubly linked list with head AND tail pointers: all end ops are O(1).
    static class Node { int v; Node prev, next; Node(int v) { this.v = v; } }

    static DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));
    static byte[] buf = new byte[32];

    static int readByte() throws IOException { return in.read(); }

    // read next token into buf, return length
    static int nextToken() throws IOException {
        int r = readByte();
        while (r <= 32 && r != -1) r = readByte();
        int n = 0;
        while (r > 32 && r != -1) { buf[n++] = (byte) r; r = readByte(); }
        return n;
    }

    static int ni() throws IOException {
        int r = readByte();
        while (r != '-' && (r < '0' || r > '9')) r = readByte();
        boolean neg = r == '-';
        if (neg) r = readByte();
        int x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = readByte(); }
        return neg ? -x : x;
    }

    static Node head = null, tail = null;
    static int len = 0;

    static void pushFront(int v) {
        Node nd = new Node(v);
        nd.next = head;
        if (head != null) head.prev = nd; else tail = nd;
        head = nd;
        len++;
    }
    static void pushBack(int v) {
        Node nd = new Node(v);
        nd.prev = tail;
        if (tail != null) tail.next = nd; else head = nd;
        tail = nd;
        len++;
    }
    static void popFront() {
        Node nd = head;
        head = head.next;
        if (head != null) head.prev = null; else tail = null;
        len--;
    }
    static void popBack() {
        Node nd = tail;
        tail = tail.prev;
        if (tail != null) tail.next = null; else head = null;
        len--;
    }
    static Node at(int i) {
        Node cur;
        if (i <= len / 2) {
            cur = head;
            for (int s = 0; s < i; s++) cur = cur.next;
        } else {
            cur = tail;
            for (int s = len - 1; s > i; s--) cur = cur.prev;
        }
        return cur;
    }

    public static void main(String[] args) throws IOException {
        int q = ni();
        for (int t = 0; t < q; t++) {
            int n = nextToken();
            char c1 = (char) buf[1];
            if (c1 == 'u') {                    // push_front / push_back
                int v = ni();
                if (buf[5] == 'f') pushFront(v); else pushBack(v);
            } else if (c1 == 'o') {             // pop_front / pop_back
                if (buf[4] == 'f') popFront(); else popBack();
            } else if (buf[0] == 'i') {         // insert i v
                int i = ni(), v = ni();
                if (i == 0) { pushFront(v); continue; }
                if (i == len) { pushBack(v); continue; }
                Node cur = at(i);
                Node nd = new Node(v);
                nd.prev = cur.prev; nd.next = cur;
                cur.prev.next = nd;
                cur.prev = nd;
                len++;
            } else {                            // erase i
                int i = ni();
                if (i == 0) { popFront(); continue; }
                if (i == len - 1) { popBack(); continue; }
                Node cur = at(i);
                cur.prev.next = cur.next;
                cur.next.prev = cur.prev;
                len--;
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
