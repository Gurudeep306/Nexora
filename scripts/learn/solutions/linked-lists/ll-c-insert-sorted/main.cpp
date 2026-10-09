#include <bits/stdc++.h>
using namespace std;

struct Node { long long v; Node* next; };

int main() {
    int n;
    long long x;
    scanf("%d%lld", &n, &x);
    Node dummy{LLONG_MIN, nullptr};   // -inf sentinel: "x is the new head" falls out of the loop
    Node* tail = &dummy;
    for (int i = 0; i < n; i++) {
        long long v;
        scanf("%lld", &v);
        Node* nd = new Node{v, nullptr};
        tail->next = nd;
        tail = nd;
    }
    // walk to the first node NOT <= x; splice before it (equals: x goes AFTER)
    Node* prev = &dummy;
    while (prev->next && prev->next->v <= x)
        prev = prev->next;
    Node* nd = new Node{x, prev->next};
    prev->next = nd;

    string out;
    bool first = true;
    for (Node* t = dummy.next; t; t = t->next) {
        if (!first) out += ' ';
        first = false;
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
