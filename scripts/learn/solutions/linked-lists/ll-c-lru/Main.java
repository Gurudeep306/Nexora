import java.io.*;
import java.util.HashMap;

public class Main {
    // Hashmap key->node plus a DOUBLY linked list ordered by recency:
    // head side = most recent, tail side = least recent. Both ops O(1).
    static class Node { int k, v; Node prev, next; Node(int k, int v) { this.k = k; this.v = v; } }

    static DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));
    static byte[] buf = new byte[16];

    static void nextToken() throws IOException {
        int r = in.read();
        while (r <= 32 && r != -1) r = in.read();
        int n = 0;
        while (r > 32 && r != -1) { buf[n++] = (byte) r; r = in.read(); }
        buf[n] = 0;
    }

    static int ni() throws IOException {
        int r = in.read();
        while (r < '0' || r > '9') r = in.read();
        int x = 0;
        while (r >= '0' && r <= '9') { x = x * 10 + (r - '0'); r = in.read(); }
        return x;
    }

    static Node head = new Node(0, 0);   // sentinels: no null checks anywhere
    static Node tail = new Node(0, 0);
    static { head.next = tail; tail.prev = head; }
    static HashMap<Integer, Node> mp = new HashMap<>();

    static void unlink(Node nd) {
        nd.prev.next = nd.next;
        nd.next.prev = nd.prev;
    }
    static void pushFront(Node nd) {     // mark most recently used
        nd.next = head.next;
        nd.prev = head;
        head.next.prev = nd;
        head.next = nd;
    }

    public static void main(String[] args) throws IOException {
        int C = ni(), q = ni();
        StringBuilder sb = new StringBuilder();
        for (int t = 0; t < q; t++) {
            nextToken();
            if (buf[0] == 'g') {             // get k
                int k = ni();
                Node nd = mp.get(k);
                if (nd == null) {
                    sb.append(-1).append('\n');
                } else {
                    unlink(nd);              // two writes — why the list is doubly
                    pushFront(nd);
                    sb.append(nd.v).append('\n');
                }
            } else {                         // put k v
                int k = ni(), v = ni();
                Node nd = mp.get(k);
                if (nd != null) {            // update existing, mark recent
                    nd.v = v;
                    unlink(nd);
                    pushFront(nd);
                } else {
                    nd = new Node(k, v);
                    mp.put(k, nd);
                    pushFront(nd);
                    if (mp.size() > C) {     // evict LEAST recently used = tail side
                        Node lru = tail.prev;
                        unlink(lru);
                        mp.remove(lru.k);
                    }
                }
            }
        }
        System.out.print(sb);
    }
}
