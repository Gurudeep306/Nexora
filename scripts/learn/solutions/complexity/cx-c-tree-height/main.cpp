#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<int> par(n + 1, 0), head(n + 1, -1), nxt(n + 1, -1);
    for (int i = 2; i <= n; i++) {
        scanf("%d", &par[i]);
        nxt[i] = head[par[i]];                        // prepend i to its parent's child list
        head[par[i]] = i;
    }
    vector<int> depth(n + 1, 0), st = {1};            // explicit stack: no recursion
    int best = 0;
    while (!st.empty()) {
        int u = st.back();
        st.pop_back();
        best = max(best, depth[u]);
        for (int w = head[u]; w != -1; w = nxt[w]) {
            depth[w] = depth[u] + 1;
            st.push_back(w);
        }
    }
    printf("%d\n", best);
}
