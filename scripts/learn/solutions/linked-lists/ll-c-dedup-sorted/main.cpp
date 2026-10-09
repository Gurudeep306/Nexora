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

    // sorted dedup: adjacency replaces the seen-set
    Node* cur = head;
    while (cur && cur->next) {
        if (cur->v == cur->next->v)
            cur->next = cur->next->next;   // unlink the repeat; cur stays
        else
            cur = cur->next;               // first occurrence of a new value
    }

    if (!head) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = head; t; t = t->next) {
        if (t != head) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
