#include <bits/stdc++.h>
using namespace std;

struct Node { long long v; Node* next; };

int main() {
    int n;
    long long x;
    scanf("%d%lld", &n, &x);
    Node* H = nullptr;
    Node* tail = nullptr;
    for (int i = 0; i < n; i++) {
        long long v;
        scanf("%lld", &v);
        Node* nd = new Node{v, nullptr};
        if (!H) H = nd;
        else tail->next = nd;
        tail = nd;
    }
    if (!H) {                       // empty ring: x alone
        printf("%lld\n", x);
        return 0;
    }
    tail->next = H;                 // close the ring

    // One lap from H, examining pairs (a, b) INCLUDING the wrap pair (last, H).
    // Insert into the FIRST qualifying pair: a <= x <= b, or the seam (a > b)
    // with x >= a or x <= b. No pair qualifies (all equal) -> insert after H.
    Node* nd = new Node{x, nullptr};
    Node* a = H;
    bool done = false;
    for (int step = 0; step < n && !done; step++) {
        Node* b = a->next;
        bool seam = a->v > b->v;
        if ((a->v <= x && x <= b->v) || (seam && (x >= a->v || x <= b->v))) {
            nd->next = b;
            a->next = nd;
            done = true;
        }
        a = b;
    }
    if (!done) {                    // all values equal: insert after H
        nd->next = H->next;
        H->next = nd;
    }

    string out;
    Node* t = H;
    for (int i = 0; i < n + 1; i++) {
        if (i) out += ' ';
        out += to_string(t->v);
        t = t->next;
    }
    puts(out.c_str());
    return 0;
}
