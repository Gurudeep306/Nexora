#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    const long long MOD = 1000000007LL;
    int n;
    cin >> n;
    vector<long long> a(n), out(n);
    for (auto &v : a) cin >> v;
    long long pre = 1;
    for (int i = 0; i < n; i++) { out[i] = pre; pre = pre * (a[i] % MOD) % MOD; }   // product left of i
    long long suf = 1;
    for (int i = n - 1; i >= 0; i--) {                                              // times product right of i
        out[i] = out[i] * suf % MOD;
        suf = suf * (a[i] % MOD) % MOD;
    }
    for (int i = 0; i < n; i++) cout << out[i] << (i + 1 == n ? '\n' : ' ');
}
