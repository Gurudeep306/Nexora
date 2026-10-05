#include <bits/stdc++.h>
using namespace std;

int main() {
    int q;
    scanf("%d", &q);
    vector<int> a;
    a.reserve(q);
    size_t head = 0;                              // index of the current front
    string out;
    while (q--) {
        int t;
        scanf("%d", &t);
        if (t == 1) { int x; scanf("%d", &x); a.push_back(x); }
        else { out += to_string(a[head++]); out += '\n'; }   // O(1): nothing moves
    }
    fputs(out.c_str(), stdout);
}
