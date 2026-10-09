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
        tail->next = new Node{v, nullptr};
        tail = tail->next;
    }
    // one pass: slow trails fast, ending on the victim's PREDECESSOR
    Node* slow = &dummy;
    Node* fast = &dummy;
    while (fast->next && fast->next->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    Node* victim = slow->next;   // floor(n/2): second middle on even n
    slow->next = victim->next;   // bypass FIRST...
    delete victim;               // ...then free

    Node* head = dummy.next;
    if (!head) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = head; t; t = t->next) {
        if (t != head) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
