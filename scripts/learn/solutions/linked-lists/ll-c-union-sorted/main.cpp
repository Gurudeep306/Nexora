#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int na, nb;
    scanf("%d %d", &na, &nb);
    Node* headA = nullptr;
    Node* tailA = nullptr;
    for (int i = 0; i < na; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        if (!headA) headA = nd;
        else tailA->next = nd;
        tailA = nd;
    }
    Node* headB = nullptr;
    Node* tailB = nullptr;
    for (int i = 0; i < nb; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        if (!headB) headB = nd;
        else tailB->next = nd;
        tailB = nd;
    }
    // merge-walk with dedup against the RESULT tail
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    auto take = [&](int v) {
        if (tail != &dummy && tail->v == v) return;   // dedup vs result tail
        tail->next = new Node{v, nullptr};
        tail = tail->next;
    };
    Node* a = headA;
    Node* b = headB;
    while (a && b) {
        if (a->v <= b->v) { take(a->v); a = a->next; }
        else              { take(b->v); b = b->next; }
    }
    while (a) { take(a->v); a = a->next; }
    while (b) { take(b->v); b = b->next; }

    if (!dummy.next) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = dummy.next; t; t = t->next) {
        if (t != dummy.next) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
