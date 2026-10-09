#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
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
    Node dummy{0, head};
    Node* groupPrev = &dummy;
    while (true) {
        // PROBE: is there a full group of k after groupPrev?
        Node* probe = groupPrev;
        for (int i = 0; i < k && probe; i++) probe = probe->next;
        if (!probe) break;                     // partial group: leave as is
        Node* groupHead = groupPrev->next;     // bookmark: becomes the group's tail
        Node* prev = nullptr;
        Node* cur = groupHead;
        for (int i = 0; i < k; i++) {          // exactly k flips
            Node* nxt = cur->next;
            cur->next = prev;
            prev = cur;
            cur = nxt;
        }
        groupPrev->next = prev;                // front stitch
        groupHead->next = cur;                 // back stitch
        groupPrev = groupHead;                 // anchor -> this group's tail
    }

    string out;
    for (Node* t = dummy.next; t; t = t->next) {
        if (t != dummy.next) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
