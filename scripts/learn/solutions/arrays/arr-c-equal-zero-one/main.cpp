#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> first(2 * n + 1, -1);            // prefix value v stored at v + n
    first[n] = 0;                                // prefix 0 before the first element
    int p = 0, best = 0;
    for (int j = 1; j <= n; j++) {
        int x;
        cin >> x;
        p += (x == 1 ? 1 : -1);                  // count a 0 as -1
        if (first[p + n] >= 0) best = max(best, j - first[p + n]);
        else first[p + n] = j;
    }
    cout << best << "\n";
}
