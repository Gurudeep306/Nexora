#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

static Node* readList(int n) {
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        tail->next = nd;
        tail = nd;
    }
    return dummy.next;
}

int main() {
    int na, nb;
    scanf("%d %d", &na, &nb);
    Node* a = readList(na);
    Node* b = readList(nb);

    // merge by relinking: dummy + tail pointer
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    while (a && b) {
        if (a->v <= b->v) { tail->next = a; a = a->next; }
        else              { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;   // attach remainder whole

    if (!dummy.next) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = dummy.next; t; t = t->next) {
        if (t != dummy.next) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
