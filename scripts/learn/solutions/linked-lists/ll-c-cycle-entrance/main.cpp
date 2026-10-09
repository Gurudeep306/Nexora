#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n, pos;
    scanf("%d %d", &n, &pos);
    vector<Node*> nodes(n);
    Node* head = nullptr;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        nodes[i] = new Node{v, nullptr};
        if (i) nodes[i - 1]->next = nodes[i];
        else head = nodes[i];
    }
    if (n && pos >= 0) nodes[n - 1]->next = nodes[pos];   // build the cycle

    // Phase 1: Floyd detect — tortoise 1, hare 2
    Node* slow = head;
    Node* fast = head;
    bool met = false;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) { met = true; break; }
    }
    if (!met) { printf("-1\n"); return 0; }

    // Phase 2: restart at head, both walk 1 step — they meet at the entrance
    Node* p = head;
    while (p != slow) {
        p = p->next;
        slow = slow->next;
    }
    // report the 0-based index of the entrance node (array kept for I/O only)
    int idx = -1;
    for (int i = 0; i < n; i++) {
        if (nodes[i] == p) { idx = i; break; }
    }
    printf("%d\n", idx);
    return 0;
}
