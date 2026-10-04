#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<long long> a(n), D(n + 1, 0);
    for (auto &v : a) cin >> v;
    while (m--) {
        int l, r;
        long long v;
        cin >> l >> r >> v;
        D[l] += v;                // the addition starts at l
        D[r + 1] -= v;            // ... and stops after r
    }
    long long run = 0;
    string out;
    for (int i = 0; i < n; i++) {
        run += D[i];
        out += to_string(a[i] + run);
        out += (i + 1 == n ? '\n' : ' ');
    }
    cout << out;
}
