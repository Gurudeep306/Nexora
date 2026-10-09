#include <bits/stdc++.h>
using namespace std;

// Dummy head so add/delete never special-case the head, tail pointer so
// addAtTail is two writes, size counter so bad indexes die in O(1).
struct Node { int v; Node* next; };

int main() {
    int q;
    scanf("%d", &q);
    Node dummy{0, nullptr};
    Node* tail = &dummy;   // tail == &dummy means the list is empty
    int size = 0;

    auto nodeBefore = [&](int i) {   // node whose next is position i (0-based walk)
        Node* cur = &dummy;
        for (int s = 0; s < i; s++) cur = cur->next;
        return cur;
    };

    string out;
    char op[24];
    for (int t = 0; t < q; t++) {
        scanf("%23s", op);
        if (op[0] == 'g') {              // get i
            int i; scanf("%d", &i);
            int r = -1;
            if (i >= 0 && i < size) {
                Node* cur = &dummy;
                for (int s = 0; s <= i; s++) cur = cur->next;
                r = cur->v;
            }
            out += to_string(r);
            out += '\n';
        } else if (op[5] == 'H') {       // addAtHead v
            int v; scanf("%d", &v);
            Node* nd = new Node{v, dummy.next};
            dummy.next = nd;
            if (size == 0) tail = nd;
            size++;
        } else if (op[5] == 'T') {       // addAtTail v
            int v; scanf("%d", &v);
            Node* nd = new Node{v, nullptr};
            tail->next = nd;
            tail = nd;
            size++;
        } else if (op[0] == 'a') {       // addAtIndex i v
            int i, v; scanf("%d%d", &i, &v);
            if (i <= 0) {                // front (also covers negatives)
                Node* nd = new Node{v, dummy.next};
                dummy.next = nd;
                if (size == 0) tail = nd;
                size++;
            } else if (i == size) {      // append
                Node* nd = new Node{v, nullptr};
                tail->next = nd;
                tail = nd;
                size++;
            } else if (i < size) {       // interior splice after node i-1
                Node* prev = nodeBefore(i);
                Node* nd = new Node{v, prev->next};
                prev->next = nd;
                size++;
            }                            // i > size: ignored
        } else {                         // deleteAtIndex i
            int i; scanf("%d", &i);
            if (i < 0 || i >= size) continue;
            Node* prev = nodeBefore(i);
            Node* victim = prev->next;
            prev->next = victim->next;
            if (victim == tail) tail = prev;
            delete victim;
            size--;
        }
    }
    fputs(out.c_str(), stdout);
    return 0;
}
