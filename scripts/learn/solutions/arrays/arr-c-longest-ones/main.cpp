#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (auto &v : a) cin >> v;
    int lo = 0, zeros = 0, best = 0;
    for (int hi = 0; hi < n; hi++) {
        if (a[hi] == 0) zeros++;
        while (zeros > k) {                       // too many zeros to flip: shrink
            if (a[lo] == 0) zeros--;
            lo++;
        }
        best = max(best, hi - lo + 1);
    }
    cout << best << "\n";
}
