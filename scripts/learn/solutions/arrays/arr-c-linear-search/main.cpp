#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    long long x;
    cin >> x;
    int ans = -1;
    for (int i = 0; i < n; i++)
        if (a[i] == x) { ans = i; break; }   // first occurrence: stop here
    cout << ans << "\n";
}
