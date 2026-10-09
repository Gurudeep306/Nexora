#include <bits/stdc++.h>
using namespace std;

// Hashmap key->node plus a DOUBLY linked list ordered by recency:
// head side = most recent, tail side = least recent. Both ops O(1).
struct Node { int k, v; Node *prev, *next; };

int main() {
    int C, q;
    scanf("%d%d", &C, &q);
    Node head{0, 0, nullptr, nullptr};   // sentinels: no null checks anywhere
    Node tail{0, 0, nullptr, nullptr};
    head.next = &tail;
    tail.prev = &head;
    unordered_map<int, Node*> mp;
    mp.reserve(256);

    auto unlink = [](Node* nd) {
        nd->prev->next = nd->next;
        nd->next->prev = nd->prev;
    };
    auto pushFront = [&](Node* nd) {     // mark most recently used
        nd->next = head.next;
        nd->prev = &head;
        head.next->prev = nd;
        head.next = nd;
    };

    string out;
    char op[8];
    for (int t = 0; t < q; t++) {
        scanf("%7s", op);
        if (op[0] == 'g') {              // get k
            int k; scanf("%d", &k);
            auto it = mp.find(k);
            if (it == mp.end()) {
                out += "-1\n";
            } else {
                Node* nd = it->second;
                unlink(nd);              // two writes — why the list is doubly
                pushFront(nd);
                out += to_string(nd->v);
                out += '\n';
            }
        } else {                         // put k v
            int k, v; scanf("%d%d", &k, &v);
            auto it = mp.find(k);
            if (it != mp.end()) {        // update existing, mark recent
                Node* nd = it->second;
                nd->v = v;
                unlink(nd);
                pushFront(nd);
            } else {
                Node* nd = new Node{k, v, nullptr, nullptr};
                mp[k] = nd;
                pushFront(nd);
                if ((int)mp.size() > C) {   // evict LEAST recently used = tail side
                    Node* lru = tail.prev;
                    unlink(lru);
                    mp.erase(lru->k);
                    delete lru;
                }
            }
        }
    }
    fputs(out.c_str(), stdout);
    return 0;
}
