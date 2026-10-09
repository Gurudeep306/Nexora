#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n;
    scanf("%d", &n);
    Node* head = nullptr;
    Node* inTail = nullptr;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        if (!head) head = nd;
        else inTail->next = nd;
        inTail = nd;
    }
    // thread three dummy-headed chains in one walk
    Node d0{0, nullptr}, d1{0, nullptr}, d2{0, nullptr};
    Node* t[3] = {&d0, &d1, &d2};
    Node* cur = head;
    while (cur) {
        Node* nxt = cur->next;   // save: cur is about to leave the input
        int b = cur->v;
        t[b]->next = cur;        // route to its chain's tail
        t[b] = cur;
        cur = nxt;
    }
    t[2]->next = nullptr;        // SEAL the last tail (others are overwritten below)
    // concatenate the non-empty chains 0 -> 1 -> 2
    Node* d[3] = {d0.next, d1.next, d2.next};
    Node* res = nullptr;
    Node* resTail = nullptr;
    for (int b = 0; b < 3; b++) {
        if (!d[b]) continue;
        if (!res) res = d[b];
        else resTail->next = d[b];
        resTail = t[b];
    }
    if (!res) { puts("EMPTY"); return 0; }
    resTail->next = nullptr;     // belt-and-braces seal on the true last chain
    string out;
    for (Node* x = res; x; x = x->next) {
        if (x != res) out += ' ';
        out += to_string(x->v);
    }
    puts(out.c_str());
    return 0;
}
