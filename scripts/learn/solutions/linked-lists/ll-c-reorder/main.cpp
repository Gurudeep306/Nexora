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

    if (head && head->next) {
        // Phase 1: middle (next-next guard: slow = last node of first half) + cut
        Node* slow = head;
        Node* fast = head;
        while (fast->next && fast->next->next) {
            slow = slow->next;
            fast = fast->next->next;
        }
        Node* second = slow->next;
        slow->next = nullptr;              // cut

        // Phase 2: reverse the second half — save before you sever
        Node* prev = nullptr;
        Node* cur = second;
        while (cur) {
            Node* nxt = cur->next;
            cur->next = prev;
            prev = cur;
            cur = nxt;
        }
        second = prev;

        // Phase 3: zip; the shorter-or-equal second chain drives the loop
        Node* first = head;
        while (second) {
            Node* t1 = first->next;
            Node* t2 = second->next;       // save BOTH before any write
            first->next = second;
            second->next = t1;
            first = t1;
            second = t2;
        }
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
