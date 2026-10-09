#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int na, nb, nc;
    scanf("%d %d %d", &na, &nb, &nc);

    auto readChain = [](int n) {
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
        return pair<Node*, Node*>{head, tail};
    };

    auto [ha, ta] = readChain(na);   // A's own part
    auto [hb, tb] = readChain(nb);   // B's own part
    auto [hc, tc] = readChain(nc);   // shared tail (SAME nodes for both lists)
    if (ta) ta->next = hc;           // A = own + shared
    if (tb) tb->next = hc;           // B = own + shared
    Node* A = ha ? ha : hc;          // A's full head (na = 0 -> shared head IS A)
    Node* B = hb ? hb : hc;

    // switch-partners walk: both routes reach the join after na + nb steps
    Node* p = A;
    Node* q = B;
    while (p != q) {
        p = p ? p->next : B;
        q = q ? q->next : A;
    }

    int ans = -1;
    if (p) {                         // met on a real node: find its index along A
        ans = 0;
        for (Node* t = A; t != p; t = t->next) ans++;
    }
    printf("%d\n", ans);
    return 0;
}
