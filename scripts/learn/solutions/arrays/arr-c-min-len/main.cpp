#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long S;
    cin >> n >> S;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    long long s = 0;
    int lo = 0, best = INT_MAX;
    for (int hi = 0; hi < n; hi++) {
        s += a[hi];                               // extend to the right
        while (s >= S) {                          // big enough: record, then shrink
            best = min(best, hi - lo + 1);
            s -= a[lo++];
        }
    }
    cout << (best == INT_MAX ? 0 : best) << "\n";
}
