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
    // reverse: save before you sever
    Node* prev = nullptr;
    Node* cur = head;
    while (cur) {
        Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    if (!prev) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = prev; t; t = t->next) {
        if (t != prev) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
