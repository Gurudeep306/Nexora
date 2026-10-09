#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

static void emit(Node* h, string& out) {
    if (!h) { out += "EMPTY\n"; return; }
    bool first = true;
    for (Node* t = h; t; t = t->next) {
        if (!first) out += ' ';
        first = false;
        out += to_string(t->v);
    }
    out += '\n';
}

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
    // split convention: slow=head, fast=head->next, while(fast && fast->next)
    Node* slow = head;
    Node* fast = head ? head->next : nullptr;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    Node* second = slow->next;
    slow->next = nullptr;              // THE CUT

    string out;
    emit(head, out);
    emit(second, out);
    fwrite(out.data(), 1, out.size(), stdout);
    return 0;
}
