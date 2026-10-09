#include <bits/stdc++.h>
using namespace std;

struct Node { long long c; int e; Node* next; };

int main() {
    int na, nb;
    scanf("%d %d", &na, &nb);
    Node* headA = nullptr;
    Node* tailA = nullptr;
    for (int i = 0; i < na; i++) {
        long long c; int e;
        scanf("%lld %d", &c, &e);
        Node* nd = new Node{c, e, nullptr};
        if (!headA) headA = nd;
        else tailA->next = nd;
        tailA = nd;
    }
    Node* headB = nullptr;
    Node* tailB = nullptr;
    for (int i = 0; i < nb; i++) {
        long long c; int e;
        scanf("%lld %d", &c, &e);
        Node* nd = new Node{c, e, nullptr};
        if (!headB) headB = nd;
        else tailB->next = nd;
        tailB = nd;
    }
    // merge-walk on DESCENDING exponents; tie -> sum, drop if zero
    Node dummy{0, 0, nullptr};
    Node* tail = &dummy;
    auto append = [&](long long c, int e) {
        tail->next = new Node{c, e, nullptr};
        tail = tail->next;
    };
    Node* a = headA;
    Node* b = headB;
    while (a && b) {
        if (a->e > b->e) { append(a->c, a->e); a = a->next; }
        else if (b->e > a->e) { append(b->c, b->e); b = b->next; }
        else {
            long long s = a->c + b->c;
            if (s != 0) append(s, a->e);   // cancel-and-drop
            a = a->next;
            b = b->next;
        }
    }
    while (a) { append(a->c, a->e); a = a->next; }
    while (b) { append(b->c, b->e); b = b->next; }

    if (!dummy.next) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = dummy.next; t; t = t->next) {
        if (t != dummy.next) out += ' ';
        out += to_string(t->c) + ' ' + to_string(t->e);
    }
    puts(out.c_str());
    return 0;
}
