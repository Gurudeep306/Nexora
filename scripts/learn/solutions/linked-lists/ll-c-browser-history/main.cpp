#include <bits/stdc++.h>
using namespace std;

// Cursor inside a DOUBLY linked list: back/forward are prev/next hops,
// and visit-unlinks-forward is O(1) with prev+next in hand.
struct Node { string url; Node *prev, *next; };

int main() {
    static char buf[256];
    scanf("%255s", buf);
    Node* cur = new Node{string(buf), nullptr, nullptr};

    int q;
    scanf("%d", &q);
    string out;
    char op[16];
    for (int t = 0; t < q; t++) {
        scanf("%15s", op);
        if (op[0] == 'v') {                 // visit url
            scanf("%255s", buf);
            Node* nd = new Node{string(buf), cur, nullptr};
            cur->next = nd;                 // forward history is simply dropped
            cur = nd;                       // (unreachable, no unlinking needed)
        } else if (op[0] == 'b') {          // back k
            int k; scanf("%d", &k);
            while (k-- && cur->prev) cur = cur->prev;
            out += cur->url;
            out += '\n';
        } else {                            // forward k
            int k; scanf("%d", &k);
            while (k-- && cur->next) cur = cur->next;
            out += cur->url;
            out += '\n';
        }
    }
    fputs(out.c_str(), stdout);
    return 0;
}
