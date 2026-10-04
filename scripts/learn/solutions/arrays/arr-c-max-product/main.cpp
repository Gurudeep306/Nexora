#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    long long hi = a[0], lo = a[0], best = a[0];     // max / min product ending here
    for (int i = 1; i < n; i++) {
        long long x = a[i];
        if (x < 0) swap(hi, lo);                     // a negative flips max and min
        hi = max(x, hi * x);
        lo = min(x, lo * x);
        best = max(best, hi);
    }
    cout << best << "\n";
}
