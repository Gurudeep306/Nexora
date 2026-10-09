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
    // fixed gap of n: send first ahead, then slide both
    Node* first = head;
    Node* second = head;
    for (int i = 0; i < nth; i++) first = first->next;
    while (first) {
        first = first->next;
        second = second->next;
    }
    printf("%d\n", second->v);
    return 0;
}
