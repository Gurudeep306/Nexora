#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007LL;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T;
    cin >> T;
    vector<pair<int, int>> q(T);
    int N = 1;
    for (auto &[m, c] : q) { cin >> m >> c; N = max(N, m); }
    vector<long long> inv(N + 1), H(N + 1, 0);
    inv[1] = 1;
    for (int i = 2; i <= N; i++) inv[i] = (MOD - (MOD / i) * inv[MOD % i] % MOD) % MOD;
    for (int i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % MOD;   // harmonic numbers mod p
    string out;
    for (auto [m, c] : q) out += to_string((long long)m * ((H[m] - H[m - c] + MOD) % MOD) % MOD) + '\n';
    cout << out;
}
