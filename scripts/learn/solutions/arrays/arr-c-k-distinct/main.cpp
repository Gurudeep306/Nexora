#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    unordered_map<long long, int> cnt;
    cnt.reserve(2 * n + 1);
    int lo = 0, distinct = 0, best = 0;
    for (int hi = 0; hi < n; hi++) {
        if (cnt[a[hi]]++ == 0) distinct++;          // a new value entered the window
        while (distinct > k)
            if (--cnt[a[lo++]] == 0) distinct--;    // a value left the window completely
        best = max(best, hi - lo + 1);
    }
    cout << best << "\n";
}
