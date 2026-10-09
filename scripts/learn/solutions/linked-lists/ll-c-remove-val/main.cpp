#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n, x;
    scanf("%d%d", &n, &x);
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        tail->next = nd;
        tail = nd;
    }
    // dummy head: walk with prev, unlink matching prev->next, do NOT advance prev
    Node* prev = &dummy;
    while (prev->next) {
        if (prev->next->v == x) {
            Node* victim = prev->next;
            prev->next = victim->next;   // unlink; prev stays put
            delete victim;
        } else {
            prev = prev->next;           // only advance when we KEEP the node
        }
    }
    Node* head = dummy.next;             // never return the original head
    if (!head) { puts("EMPTY"); return 0; }
    string out;
    bool first = true;
    for (Node* t = head; t; t = t->next) {
        if (!first) out += ' ';
        first = false;
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
