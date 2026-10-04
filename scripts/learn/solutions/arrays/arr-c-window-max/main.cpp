#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    long long s = 0;
    for (int i = 0; i < k; i++) s += a[i];
    long long best = s;                          // the first window, not 0
    for (int i = k; i < n; i++) {
        s += a[i] - a[i - k];                    // one enters, one leaves
        best = max(best, s);
    }
    cout << best << "\n";
}
