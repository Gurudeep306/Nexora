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
    // thread two chains in one walk
    Node dA{0, nullptr}, dB{0, nullptr};
    Node *tA = &dA, *tB = &dB;
    Node* cur = head;
    bool toA = true;
    while (cur) {
        Node* nxt = cur->next;      // save BEFORE threading rewrites cur->next
        if (toA) { tA->next = cur; tA = cur; }
        else     { tB->next = cur; tB = cur; }
        toA = !toA;
        cur = nxt;
    }
    tA->next = nullptr;             // SEAL both tails
    tB->next = nullptr;

    string lineA, lineB;
    for (Node* x = dA.next; x; x = x->next) {
        if (x != dA.next) lineA += ' ';
        lineA += to_string(x->v);
    }
    for (Node* x = dB.next; x; x = x->next) {
        if (x != dB.next) lineB += ' ';
        lineB += to_string(x->v);
    }
    string out = (lineA.empty() ? "EMPTY" : lineA) + "\n" + (lineB.empty() ? "EMPTY" : lineB);
    puts(out.c_str());
    return 0;
}
