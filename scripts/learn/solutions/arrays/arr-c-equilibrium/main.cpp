#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    long long total = 0;
    for (auto &v : a) { cin >> v; total += v; }
    long long left = 0;                       // sum of a[0..i-1]
    for (int i = 0; i < n; i++) {
        if (left == total - left - a[i]) { cout << i << "\n"; return 0; }
        left += a[i];
    }
    cout << -1 << "\n";
}
