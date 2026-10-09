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

    static Node[] readChain(int n) {
        Node[] arr = new Node[n];
        Node head = null, tail = null;
        for (int i = 0; i < n; i++) {
            Node nd = new Node(niSafe());
            arr[i] = nd;
            if (head == null) head = nd; else tail.next = nd;
            tail = nd;
        }
        return arr;
    }
    static int niSafe() {
        try { return ni(); } catch (IOException e) { throw new RuntimeException(e); }
    }

    // Floyd: returns the entrance if head's list cycles, else null.
    // (A non-cyclic list's "entrance" is irrelevant; cyclicity is reported via the boolean box.)
    static boolean[] cycBox = new boolean[1];
    static Node floyd(Node head) {
        cycBox[0] = false;
        if (head == null) return null;
        Node slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {                 // meeting point
                Node p = head;
                while (p != slow) { p = p.next; slow = slow.next; }
                cycBox[0] = true;
                return p;                       // entrance
            }
        }
        return null;
    }

    static int distTo(Node head, Node target) { // target reachable without looping
        int d = 0;
        for (Node p = head; p != target; p = p.next) d++;
        return d;
    }

    public static void main(String[] args) throws IOException {
        int na = ni(), nb = ni(), nc = ni(), pos = ni();
        Node[] ownA = readChain(na);
        Node[] ownB = readChain(nb);
        Node[] shared = readChain(nc);   // shared nodes built ONCE — both lists point into them
        Node sharedHead = nc > 0 ? shared[0] : null;
        // head of each list: its own part, or the shared part when it has no own nodes
        Node headA = na > 0 ? ownA[0] : sharedHead;
        Node headB = nb > 0 ? ownB[0] : sharedHead;
        if (na > 0 && sharedHead != null) ownA[na - 1].next = sharedHead;
        if (nb > 0 && sharedHead != null) ownB[nb - 1].next = sharedHead;
        if (nc > 0 && pos >= 0) shared[nc - 1].next = shared[pos];   // cycle

        Node entA = floyd(headA);
        boolean cycA = cycBox[0];
        Node entB = floyd(headB);
        boolean cycB = cycBox[0];

        int answer = -1;
        if (cycA != cycB) {
            answer = -1;                        // exactly one cyclic: cannot intersect
        } else if (!cycA) {
            // both acyclic: length-align, walk in lockstep, compare NODES
            int lenA = distTo(headA, null), lenB = distTo(headB, null);
            Node a = headA, b = headB;
            int idx = 0;
            for (int d = lenA - lenB; d > 0; d--) { a = a.next; idx++; }
            for (int d = lenB - lenA; d > 0; d--) b = b.next;
            while (a != b) { a = a.next; b = b.next; idx++; }
            if (a != null) answer = idx;        // both null -> -1
        } else if (entA == entB) {
            // same entrance: the Y happens BEFORE the cycle — aligned walk bounded by it
            int dA = distTo(headA, entA), dB = distTo(headB, entB);
            Node a = headA, b = headB;
            int idx = 0;
            for (int d = dA - dB; d > 0; d--) { a = a.next; idx++; }
            for (int d = dB - dA; d > 0; d--) b = b.next;
            while (a != b && a != entA) { a = a.next; b = b.next; idx++; }
            answer = (a == b) ? idx : dA;
        } else {
            // different entrances: intersect iff B's entrance lies on A's cycle
            Node p = entA;
            boolean found = false;
            do {
                if (p == entB) { found = true; break; }
                p = p.next;
            } while (p != entA);
            if (found) answer = distTo(headA, entA);   // first shared node IS A's entrance
        }
        System.out.println(answer);
    }
}
