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

    // Act 1: Floyd detect — tortoise 1, hare 2
    Node* slow = head;
    Node* fast = head;
    bool met = false;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) { met = true; break; }
    }
    if (!met) { printf("0\n"); return 0; }

    // Act 2: freeze slow, walk p around one full lap
    Node* p = slow->next;
    int C = 1;
    while (p != slow) {
        p = p->next;
        C++;
    }
    printf("%d\n", C);
    return 0;
}
