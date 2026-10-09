#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

static Node* reverseList(Node* head) {
    Node* prev = nullptr;
    Node* cur = head;
    while (cur) {
        Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
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

    bool ok = true;
    if (head) {
        // split: next-next guard leaves slow at the LAST node of the first half
        Node* slow = head;
        Node* fast = head;
        while (fast->next && fast->next->next) {
            slow = slow->next;
            fast = fast->next->next;
        }
        Node* secondHead = slow->next;   // floor(n/2) nodes AFTER slow
        slow->next = nullptr;            // cut
        secondHead = reverseList(secondHead);

        Node* p = head;
        for (Node* q = secondHead; q; q = q->next, p = p->next) {
            if (p->v != q->v) { ok = false; break; }
        }

        slow->next = reverseList(secondHead);   // RESTORE on both exits
    }
    puts(ok ? "1" : "0");
    return 0;
}
