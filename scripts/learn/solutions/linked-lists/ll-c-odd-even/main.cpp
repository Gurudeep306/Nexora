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

    // odd/even POSITIONS: two chains grow in one walk
    if (head) {
        Node* odd = head;
        Node* even = head->next;
        Node* evenHead = even;         // save: even strides away
        while (even && even->next) {   // even runs out first — guard it
            odd->next = even->next;
            odd = odd->next;
            even->next = odd->next;
            even = even->next;
        }
        odd->next = evenHead;          // one write concatenates
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
