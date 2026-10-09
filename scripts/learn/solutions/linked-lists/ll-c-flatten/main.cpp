#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<int> v(n), nxt(n), chd(n);
    for (int i = 0; i < n; i++) scanf("%d %d %d", &v[i], &nxt[i], &chd[i]);

    // iterative DFS: the stack holds RETURN POINTS — what recursion holds on frames
    vector<int> stk;
    stk.reserve(n);
    string out;
    int cur = 0; // head is node 0
    while (cur != -1 || !stk.empty()) {
        if (cur == -1) { cur = stk.back(); stk.pop_back(); continue; }
        if (!out.empty()) out += ' ';
        out += to_string(v[cur]);          // preorder: settle THIS node first
        if (chd[cur] != -1) {
            stk.push_back(nxt[cur]);       // resume here AFTER the child subtree
            nxt[cur] = chd[cur];           // splice the child in (explicit relink)
            chd[cur] = -1;                 // detach: flattening destroys the hierarchy
        }
        cur = nxt[cur];                    // dive into child, or advance along the level
    }
    puts(out.c_str());
    return 0;
}
