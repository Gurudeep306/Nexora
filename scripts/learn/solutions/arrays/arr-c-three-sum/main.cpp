#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    sort(a.begin(), a.end());
    long long count = 0;
    for (int i = 0; i < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;      // each first value once
        int lo = i + 1, hi = n - 1;
        while (lo < hi) {
            long long s = a[i] + a[lo] + a[hi];
            if (s < 0) lo++;
            else if (s > 0) hi--;
            else {
                count++;
                lo++;
                while (lo < hi && a[lo] == a[lo - 1]) lo++;   // each second value once
                hi--;
            }
        }
    }
    cout << count << "\n";
}
