#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n, x;
    scanf("%d %d", &n, &x);          // |x| <= 1e9 fits in int
    Node* head = nullptr;
    Node* tail = nullptr;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        if (!head) head = nd;
        else tail->next = nd;
        tail = nd;
    }

    // two dummy-headed chains: < x and >= x, appended in arrival order (stable)
    Node lessD{0, nullptr}, geqD{0, nullptr};
    Node* less = &lessD;
    Node* geq = &geqD;
    for (Node* cur = head; cur; cur = cur->next) {
        if (cur->v < x) { less->next = cur; less = cur; }
        else            { geq->next = cur; geq = cur; }
    }
    geq->next = nullptr;        // SEAL the right chain
    less->next = geqD.next;     // concatenate: one write

    if (!lessD.next) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = lessD.next; t; t = t->next) {
        if (t != lessD.next) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
