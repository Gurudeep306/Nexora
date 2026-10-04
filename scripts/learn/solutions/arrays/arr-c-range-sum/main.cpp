#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, q;
    cin >> n >> q;
    vector<long long> P(n + 1, 0);              // P[i] = a[0] + ... + a[i-1]
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        P[i + 1] = P[i] + x;
    }
    string out;
    while (q--) {
        int l, r;
        cin >> l >> r;
        out += to_string(P[r + 1] - P[l]);
        out += '\n';
    }
    cout << out;
}
