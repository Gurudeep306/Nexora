#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    int p;
    cin >> p;
    for (int i = p; i + 1 < n; i++) a[i] = a[i + 1];   // shift left, from the hole
    n--;
    if (n == 0) { cout << "EMPTY\n"; return 0; }
    for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? '\n' : ' ');
}
