#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n;
    scanf("%d", &n);
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

    // insertion sort: dummy-headed sorted result, detach + scan + splice
    Node dummy{0, nullptr};
    Node* cur = head;
    while (cur) {
        Node* nxt = cur->next;              // save before cur leaves the input
        Node* p = &dummy;
        while (p->next && p->next->v < cur->v)  // strict < keeps it stable
            p = p->next;
        cur->next = p->next;                // splice: two writes
        p->next = cur;
        cur = nxt;
    }

    if (!dummy.next) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = dummy.next; t; t = t->next) {
        if (t != dummy.next) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
