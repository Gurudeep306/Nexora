#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n;
    scanf("%d", &n);
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        tail->next = nd;
        tail = nd;
    }
    // dummy head (the head itself can be a victim); prev never enters a run.
    Node* prev = &dummy;
    while (prev->next && prev->next->next) {
        if (prev->next->v == prev->next->next->v) {
            int dup = prev->next->v;               // remember the run's value
            while (prev->next && prev->next->v == dup) {
                Node* victim = prev->next;         // unlink the WHOLE run
                prev->next = victim->next;
                delete victim;
            }
            // prev stays put: the new prev->next is unexamined
        } else {
            prev = prev->next;                     // unique so far, keep it
        }
    }
    Node* head = dummy.next;
    if (!head) { puts("EMPTY"); return 0; }
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
