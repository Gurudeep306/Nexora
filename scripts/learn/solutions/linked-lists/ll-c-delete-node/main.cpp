#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

// The classic trick: given ONLY a pointer to the victim (never the tail),
// copy the successor's value forward and bypass the successor.
void deleteNode(Node* node) {
    Node* victim = node->next;   // the node we can actually unlink
    node->v = victim->v;         // steal its contents
    node->next = victim->next;   // bypass it
    delete victim;               // must still be freed
}

int main() {
    int n, idx;
    scanf("%d%d", &n, &idx);
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
    // walk to position idx — in the interview you are HANDED this pointer
    Node* node = head;
    for (int i = 0; i < idx; i++) node = node->next;

    deleteNode(node);

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
