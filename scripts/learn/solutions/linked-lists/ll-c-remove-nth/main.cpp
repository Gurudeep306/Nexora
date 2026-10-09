#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int len, nth;
    scanf("%d %d", &len, &nth);
    Node* head = nullptr;
    Node* tail = nullptr;
    for (int i = 0; i < len; i++) {
        int v;
        scanf("%d", &v);
        Node* nd = new Node{v, nullptr};
        if (!head) head = nd;
        else tail->next = nd;
        tail = nd;
    }
    // dummy head + gap n+1: second lands on the victim's predecessor
    Node dummy{0, head};
    Node* first = &dummy;
    Node* second = &dummy;
    for (int i = 0; i < nth + 1; i++) first = first->next;
    while (first) {
        first = first->next;
        second = second->next;
    }
    second->next = second->next->next;   // skip over the victim

    Node* res = dummy.next;
    if (!res) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = res; t; t = t->next) {
        if (t != res) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
