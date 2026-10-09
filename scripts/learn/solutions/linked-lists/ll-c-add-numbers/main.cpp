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
    // stream the carry forward: a || b || carry absorbs ragged lengths and the final carry
    int carry = 0;
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    Node* a = headA;
    Node* b = headB;
    while (a || b || carry) {
        int sum = carry;
        if (a) { sum += a->v; a = a->next; }
        if (b) { sum += b->v; b = b->next; }
        carry = sum / 10;
        tail->next = new Node{sum % 10, nullptr};
        tail = tail->next;
    }
    string out;
    for (Node* t = dummy.next; t; t = t->next) {
        if (t != dummy.next) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
