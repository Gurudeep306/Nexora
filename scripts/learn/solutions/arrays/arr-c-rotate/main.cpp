#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    int r = (int)(k % n);                 // only k mod n matters
    reverse(a.begin(), a.end());          // B^R A^R
    reverse(a.begin(), a.begin() + r);    // B   A^R
    reverse(a.begin() + r, a.end());      // B   A
    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? '\n' : ' ');
}
