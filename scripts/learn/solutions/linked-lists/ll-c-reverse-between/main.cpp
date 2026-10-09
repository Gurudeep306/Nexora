#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n, m, k;
    scanf("%d %d %d", &n, &m, &k);
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
    // dummy head absorbs m == 1
    Node dummy{0, head};
    Node* anchor = &dummy;
    for (int i = 1; i < m; i++) anchor = anchor->next;   // position m-1
    Node* rangeHead = anchor->next;                      // bookmark BEFORE flipping
    Node* prev = nullptr;
    Node* cur = rangeHead;
    for (int i = 0; i < k - m + 1; i++) {                // exactly k-m+1 flips
        Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    anchor->next = prev;       // front stitch
    rangeHead->next = cur;     // back stitch: bookmarked node is now the tail

    string out;
    for (Node* t = dummy.next; t; t = t->next) {
        if (t != dummy.next) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
