#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    int w = 0;
    for (int r = 0; r < n; r++)
        if (a[r] != 0) a[w++] = a[r];           // keep non-zeros, in order
    while (w < n) a[w++] = 0;                   // the rest are zeros
    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? '\n' : ' ');
}
