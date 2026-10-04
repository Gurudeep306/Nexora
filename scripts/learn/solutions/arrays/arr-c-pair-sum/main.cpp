#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long T;
    cin >> n >> T;
    vector<long long> a(n);
    for (auto &v : a) cin >> v;
    int i = 0, j = n - 1;
    bool found = false;
    while (i < j) {
        long long s = a[i] + a[j];
        if (s == T) { found = true; break; }
        if (s < T) i++;        // a[i] is too small for every partner left of j
        else j--;              // a[j] is too large for every partner right of i
    }
    cout << (found ? "YES" : "NO") << "\n";
}
