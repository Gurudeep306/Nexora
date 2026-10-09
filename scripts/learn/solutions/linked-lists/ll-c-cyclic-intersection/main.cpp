#include <bits/stdc++.h>
using namespace std;

struct Node { int v; Node* next; };

// Floyd: returns true if head's list cycles, and sets *ent to the entrance.
static bool floyd(Node* head, Node** ent) {
    *ent = nullptr;
    if (!head) return false;
    Node* slow = head;
    Node* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {                 // meeting point
            Node* p = head;
            while (p != slow) { p = p->next; slow = slow->next; }
            *ent = p;                       // entrance
            return true;
        }
    }
    return false;
}

static int distTo(Node* head, Node* target) { // safe: target is reachable without looping
    int d = 0;
    for (Node* p = head; p != target; p = p->next) d++;
    return d;
}

int main() {
    int na, nb, nc, pos;
    scanf("%d %d %d %d", &na, &nb, &nc, &pos);
    auto readChain = [](int n, vector<Node*>& out) {
        Node* head = nullptr;
        Node* tail = nullptr;
        for (int i = 0; i < n; i++) {
            int v;
            scanf("%d", &v);
            Node* nd = new Node{v, nullptr};
            out.push_back(nd);
            if (!head) head = nd;
            else tail->next = nd;
            tail = nd;
        }
    };
    vector<Node*> ownA, ownB, shared;
    readChain(na, ownA);
    readChain(nb, ownB);
    readChain(nc, shared);   // shared nodes built ONCE — both lists point into them
    // join: each list = own part followed by the shared part
    Node* sharedHead = shared.empty() ? nullptr : shared[0];
    // head of each list: its own part, or the shared part when it has no own nodes
    Node* headA = !ownA.empty() ? ownA[0] : sharedHead;
    Node* headB = !ownB.empty() ? ownB[0] : sharedHead;
    if (!ownA.empty() && sharedHead) ownA.back()->next = sharedHead;
    if (!ownB.empty() && sharedHead) ownB.back()->next = sharedHead;
    if (nc > 0 && pos >= 0) shared.back()->next = shared[pos];   // cycle

    Node *entA = nullptr, *entB = nullptr;
    bool cycA = floyd(headA, &entA);
    bool cycB = floyd(headB, &entB);

    int answer = -1;
    if (cycA != cycB) {
        answer = -1;                        // exactly one cyclic: cannot intersect
    } else if (!cycA) {
        // both acyclic: length-align, walk in lockstep, compare POINTERS
        int lenA = distTo(headA, nullptr), lenB = distTo(headB, nullptr);
        Node* a = headA;
        Node* b = headB;
        int idx = 0;
        for (int d = lenA - lenB; d > 0; d--) { a = a->next; idx++; }
        for (int d = lenB - lenA; d > 0; d--) b = b->next;
        while (a != b) { a = a->next; b = b->next; idx++; }
        if (a) answer = idx;                // both null -> -1
    } else if (entA == entB) {
        // same entrance: the Y happens BEFORE the cycle — aligned walk bounded by it
        int dA = distTo(headA, entA), dB = distTo(headB, entB);
        Node* a = headA;
        Node* b = headB;
        int idx = 0;
        for (int d = dA - dB; d > 0; d--) { a = a->next; idx++; }
        for (int d = dB - dA; d > 0; d--) b = b->next;
        while (a != b && a != entA) { a = a->next; b = b->next; idx++; }
        answer = (a == b) ? idx : distTo(headA, entA);
    } else {
        // different entrances: intersect iff B's entrance lies on A's cycle
        Node* p = entA;
        bool found = false;
        do {
            if (p == entB) { found = true; break; }
            p = p->next;
        } while (p != entA);
        if (found) answer = distTo(headA, entA);   // first shared node IS A's entrance
    }
    printf("%d\n", answer);
    return 0;
}
