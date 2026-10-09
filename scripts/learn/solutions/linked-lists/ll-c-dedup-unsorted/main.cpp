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

    // seen-set + dummy-headed prev-walk: unlink repeats, keep first occurrences
    unordered_set<int> seen;
    Node dummy{0, nullptr};
    dummy.next = head;
    Node* prev = &dummy;
    while (prev->next) {
        Node* cur = prev->next;
        if (seen.count(cur->v)) {
            prev->next = cur->next;    // unlink; prev stays
        } else {
            seen.insert(cur->v);
            prev = cur;                // keep: cur becomes the new anchor
        }
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
