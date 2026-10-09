#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

static Node* readList(int n) {
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        tail->next = nd;
        tail = nd;
    }
    return dummy.next;
}

int main() {
    int k;
    scanf("%d", &k);

    // min-heap of the K current heads
    auto cmp = [](Node* x, Node* y) { return x->v > y->v; };
    priority_queue<Node*, vector<Node*>, decltype(cmp)> pq(cmp);
    for (int i = 0; i < k; i++) {
        int ni;
        scanf("%d", &ni);
        Node* h = readList(ni);
        if (h) pq.push(h);
    }

    Node dummy{0, nullptr};
    Node* tail = &dummy;
    while (!pq.empty()) {
        Node* m = pq.top();
        pq.pop();
        tail->next = m;          // relink, no copying
        tail = m;
        if (m->next) pq.push(m->next);
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
