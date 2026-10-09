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

    // swap adjacent NODES: dummy absorbs the head change
    Node dummy{0, nullptr};
    dummy.next = head;
    Node* prev = &dummy;
    while (prev->next && prev->next->next) {   // a full pair exists
        Node* a = prev->next;
        Node* b = a->next;
        a->next = b->next;    // a adopts the rest
        b->next = a;          // b points back at a
        prev->next = b;       // chain enters the pair through b
        prev = a;             // a is the pair's new tail
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
