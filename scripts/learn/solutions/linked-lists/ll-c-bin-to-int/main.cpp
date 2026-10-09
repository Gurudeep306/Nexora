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
    // fold while walking: acc = acc*2 + bit (MSB first)
    unsigned long long acc = 0;
    for (Node* t = head; t; t = t->next)
        acc = acc * 2 + (unsigned long long)t->v;
    printf("%llu\n", acc);
    return 0;
}
