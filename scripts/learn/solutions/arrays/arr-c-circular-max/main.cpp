#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long x;
    cin >> x;
    long long total = x, curMax = x, bestMax = x, curMin = x, bestMin = x;
    for (int i = 1; i < n; i++) {
        cin >> x;
        total += x;
        curMax = max(x, curMax + x); bestMax = max(bestMax, curMax);   // best non-wrapping
        curMin = min(x, curMin + x); bestMin = min(bestMin, curMin);   // worst middle piece
    }
    if (bestMax < 0) cout << bestMax << "\n";                          // all negative
    else cout << max(bestMax, total - bestMin) << "\n";
}
