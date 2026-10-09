#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

int main() {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);        // k up to 1e9 — keep it 64-bit until reduced
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

    // close-the-ring walk
    if (head && n > 0) {
        k %= n;                          // rotating by n is a no-op
        if (k != 0) {
            tail->next = head;           // close the ring
            Node* newTail = head;
            for (long long i = 0; i < n - k - 1; i++) newTail = newTail->next;
            head = newTail->next;        // old next is the new head
            newTail->next = nullptr;     // cut
        }
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
