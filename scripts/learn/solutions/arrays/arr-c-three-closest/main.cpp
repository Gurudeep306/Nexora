#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long T;
    cin >> n >> T;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    sort(a.begin(), a.end());
    long long best = a[0] + a[1] + a[2];
    auto better = [&](long long s) {                 // closer, or equally close and smaller
        long long d = llabs(s - T), bd = llabs(best - T);
        return d < bd || (d == bd && s < best);
    };
    for (int i = 0; i < n; i++) {
        int lo = i + 1, hi = n - 1;
        while (lo < hi) {
            long long s = a[i] + a[lo] + a[hi];
            if (better(s)) best = s;
            if (s < T) lo++;
            else if (s > T) hi--;
            else { cout << s << "\n"; return 0; }    // exact hit: nothing is closer
        }
    }
    cout << best << "\n";
}
