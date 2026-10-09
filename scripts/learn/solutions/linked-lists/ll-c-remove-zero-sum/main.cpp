#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n;
    scanf("%d", &n);
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        tail->next = nd;
        tail = nd;
    }
    // Pass 1: walk storing the LAST node reaching each prefix sum (64-bit sums).
    // Prefix 0 maps to the dummy, so a zero-sum prefix deletes from the head.
    unordered_map<long long, Node*> seen;
    long long p = 0;
    seen[0] = &dummy;
    for (Node* t = dummy.next; t; t = t->next) {
        p += t->v;
        seen[p] = t;              // LAST occurrence wins (overwrite)
    }
    // Pass 2: at each node with prefix p, jump over everything up to seen[p]:
    // everything between two equal prefix sums sums to zero.
    p = 0;
    for (Node* t = &dummy; t; t = t->next) {
        p += t->v;                // dummy contributes 0
        t->next = seen[p]->next;
    }
    Node* head = dummy.next;
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
