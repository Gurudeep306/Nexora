#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

static Node* readList(int n) {
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
    return head;
}

static Node* rev(Node* head) { // save before you sever
    Node* prev = nullptr;
    Node* cur = head;
    while (cur) {
        Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}

int main() {
    int na, nb;
    scanf("%d %d", &na, &nb);
    Node* headA = readList(na);
    Node* headB = readList(nb);
    // reverse both, stream the carry, reverse the result — all iterative
    Node* a = rev(headA);
    Node* b = rev(headB);
    int carry = 0;
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    while (a || b || carry) {
        int sum = carry;
        if (a) { sum += a->v; a = a->next; }
        if (b) { sum += b->v; b = b->next; }
        carry = sum / 10;
        tail->next = new Node{sum % 10, nullptr};
        tail = tail->next;
    }
    Node* res = rev(dummy.next);
    string out;
    for (Node* t = res; t; t = t->next) {
        if (t != res) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
