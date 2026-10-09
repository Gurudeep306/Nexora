#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        tail->next = new Node{v, nullptr};
        tail = tail->next;
    }
    Node* anchor = &dummy;
    bool doReverse = true;
    while (anchor->next) {
        // PROBE: count min(k, remaining) nodes of this group
        Node* probe = anchor->next;
        int cnt = 1;
        while (cnt < k && probe->next) { probe = probe->next; cnt++; }
        if (doReverse) {
            Node* groupHead = anchor->next;
            Node* after = probe->next;      // first node past the group
            Node* prev = after;             // seed: tail links onward directly
            Node* cur = groupHead;
            while (cur != after) {
                Node* nxt = cur->next;
                cur->next = prev;
                prev = cur;
                cur = nxt;
            }
            anchor->next = prev;            // prev == probe: group's new head
            anchor = groupHead;             // original head is now the group's TAIL
        } else {
            anchor = probe;                 // skipped group's LAST node
        }
        doReverse = !doReverse;
    }
    string out;
    for (Node* t = dummy.next; t; t = t->next) {
        if (t != dummy.next) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
