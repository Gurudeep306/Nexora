#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    sort(a.begin(), a.end());                     // equal values become neighbours
    int distinct = 1;
    for (int i = 1; i < n; i++)
        if (a[i] != a[i - 1]) distinct++;         // a new block starts here
    cout << distinct << "\n";
}
