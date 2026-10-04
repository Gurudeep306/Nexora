#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    for (int i = 0; i < n; i++)
        while (a[i] >= 1 && a[i] <= n && a[a[i] - 1] != a[i])
            swap(a[i], a[a[i] - 1]);                 // send a[i] to its home index
    int ans = n + 1;
    for (int i = 0; i < n; i++)
        if (a[i] != i + 1) { ans = i + 1; break; }
    cout << ans << "\n";
}
