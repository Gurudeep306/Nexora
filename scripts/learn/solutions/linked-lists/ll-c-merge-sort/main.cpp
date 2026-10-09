#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

// slow ends at index ceil(n/2)-1; guard makes a 2-node list split 1+1
static Node* splitMiddle(Node* head) {
    Node* slow = head;
    Node* fast = head->next;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    Node* second = slow->next;
    slow->next = nullptr;   // the cut
    return second;
}

static Node* merge(Node* a, Node* b) {
    Node dummy{0, nullptr};
    Node* tail = &dummy;
    while (a && b) {
        if (a->v <= b->v) { tail->next = a; a = a->next; }
        else              { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;
    return dummy.next;
}

static Node* mergeSort(Node* head) {
    if (!head || !head->next) return head;
    Node* second = splitMiddle(head);
    Node* l = mergeSort(head);
    Node* r = mergeSort(second);
    return merge(l, r);
}

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
    head = mergeSort(head);
    if (!head) { puts("EMPTY"); return 0; }
    string out;
    for (Node* t = head; t; t = t->next) {
        if (t != head) out += ' ';
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
