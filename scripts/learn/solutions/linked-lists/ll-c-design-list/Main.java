import java.io.*;

public class Main {
    // Dummy head so add/delete never special-case the head, tail pointer so
    // addAtTail is two writes, size counter so bad indexes die in O(1).
    static class Node { int v; Node next; Node(int v, Node next) { this.v = v; this.next = next; } }

    static DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));
    static byte[] buf = new byte[32];

    static void nextToken() throws IOException {
        int r = in.read();
        while (r <= 32 && r != -1) r = in.read();
        int n = 0;
        while (r > 32 && r != -1) { buf[n++] = (byte) r; r = in.read(); }
        buf[n] = 0;
    }

    static int ni() throws IOException {
        int r = in.read();
        while (r != '-' && (r < '0' || r > '9')) r = in.read();
        boolean neg = r == '-';
        if (neg) r = in.read();
        int x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = in.read(); }
        return neg ? -x : x;
    }

    static Node dummy = new Node(0, null);
    static Node tail = dummy;   // tail == dummy means the list is empty
    static int size = 0;

    static Node nodeBefore(int i) {   // node whose next is position i
        Node cur = dummy;
        for (int s = 0; s < i; s++) cur = cur.next;
        return cur;
    }

    public static void main(String[] args) throws IOException {
        int q = ni();
        StringBuilder sb = new StringBuilder();
        for (int t = 0; t < q; t++) {
            nextToken();
            if (buf[0] == 'g') {              // get i
                int i = ni();
                int r = -1;
                if (i >= 0 && i < size) {
                    Node cur = dummy;
                    for (int s = 0; s <= i; s++) cur = cur.next;
                    r = cur.v;
                }
                sb.append(r).append('\n');
            } else if (buf[5] == 'H') {       // addAtHead v
                int v = ni();
                Node nd = new Node(v, dummy.next);
                dummy.next = nd;
                if (size == 0) tail = nd;
                size++;
            } else if (buf[5] == 'T') {       // addAtTail v
                int v = ni();
                Node nd = new Node(v, null);
                tail.next = nd;
                tail = nd;
                size++;
            } else if (buf[0] == 'a') {       // addAtIndex i v
                int i = ni(), v = ni();
                if (i <= 0) {                 // front (also covers negatives)
                    Node nd = new Node(v, dummy.next);
                    dummy.next = nd;
                    if (size == 0) tail = nd;
                    size++;
                } else if (i == size) {       // append
                    Node nd = new Node(v, null);
                    tail.next = nd;
                    tail = nd;
                    size++;
                } else if (i < size) {        // interior splice after node i-1
                    Node prev = nodeBefore(i);
                    prev.next = new Node(v, prev.next);
                    size++;
                }                             // i > size: ignored
            } else {                          // deleteAtIndex i
                int i = ni();
                if (i < 0 || i >= size) continue;
                Node prev = nodeBefore(i);
                Node victim = prev.next;
                prev.next = victim.next;
                if (victim == tail) tail = prev;
                size--;
            }
        }
        System.out.print(sb);
    }
}
