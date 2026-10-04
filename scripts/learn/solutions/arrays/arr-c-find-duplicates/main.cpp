#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> a(n);
    for (auto &v : a) cin >> v;
    vector<int> dup;
    for (int i = 0; i < n; i++) {
        int v = abs(a[i]);                   // the original value
        if (a[v - 1] < 0) dup.push_back(v);  // home slot already marked: seen before
        else a[v - 1] = -a[v - 1];           // mark v as seen
    }
    sort(dup.begin(), dup.end());
    if (dup.empty()) { cout << -1 << "\n"; return 0; }
    for (size_t k = 0; k < dup.size(); k++) cout << dup[k] << (k + 1 == dup.size() ? '\n' : ' ');
}
