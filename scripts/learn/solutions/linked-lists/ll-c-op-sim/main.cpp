#include <bits/stdc++.h>
using namespace std;

// Doubly linked list with head AND tail pointers: all end ops are O(1).
struct Node { int v; Node *prev, *next; };

int main() {
    int q;
    scanf("%d", &q);
    char op[16];
    Node *head = nullptr, *tail = nullptr;
    int len = 0;

    auto pushFront = [&](int v) {
        Node* nd = new Node{v, nullptr, head};
        if (head) head->prev = nd; else tail = nd;
        head = nd;
        len++;
    };
    auto pushBack = [&](int v) {
        Node* nd = new Node{v, tail, nullptr};
        if (tail) tail->next = nd; else head = nd;
        tail = nd;
        len++;
    };
    auto popFront = [&]() {
        Node* nd = head;
        head = head->next;
        if (head) head->prev = nullptr; else tail = nullptr;
        delete nd;
        len--;
    };
    auto popBack = [&]() {
        Node* nd = tail;
        tail = tail->prev;
        if (tail) tail->next = nullptr; else head = nullptr;
        delete nd;
        len--;
    };

    for (int t = 0; t < q; t++) {
        scanf("%15s", op);
        if (op[1] == 'u') {              // push_front / push_back
            int v; scanf("%d", &v);
            if (op[5] == 'f') pushFront(v); else pushBack(v);
        } else if (op[1] == 'o') {       // pop_front / pop_back
            if (op[4] == 'f') popFront(); else popBack();
        } else if (op[0] == 'i') {       // insert i v : splice before position i
            int i, v; scanf("%d%d", &i, &v);
            if (i == 0) { pushFront(v); continue; }
            if (i == len) { pushBack(v); continue; }
            // walk from the closer end to reach node at position i
            Node* cur;
            if (i <= len / 2) {
                cur = head;
                for (int s = 0; s < i; s++) cur = cur->next;
            } else {
                cur = tail;
                for (int s = len - 1; s > i; s--) cur = cur->prev;
            }
            Node* nd = new Node{v, cur->prev, cur};
            cur->prev->next = nd;
            cur->prev = nd;
            len++;
        } else {                         // erase i
            int i; scanf("%d", &i);
            if (i == 0) { popFront(); continue; }
            if (i == len - 1) { popBack(); continue; }
            Node* cur;
            if (i <= len / 2) {
                cur = head;
                for (int s = 0; s < i; s++) cur = cur->next;
            } else {
                cur = tail;
                for (int s = len - 1; s > i; s--) cur = cur->prev;
            }
            cur->prev->next = cur->next;
            cur->next->prev = cur->prev;
            delete cur;
            len--;
        }
    }

    if (!head) { puts("EMPTY"); return 0; }
    string out;
    bool first = true;
    for (Node* t = head; t; t = t->next) {
        if (!first) out += ' ';
        first = false;
        out += to_string(t->v);
    }
    puts(out.c_str());
    return 0;
}
