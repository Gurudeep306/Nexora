#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007LL;

long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) { if (e & 1) r = r * b % MOD; b = b * b % MOD; e >>= 1; }
    return r;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T;
    cin >> T;
    vector<int> q(T);
    int N = 1;
    for (auto &x : q) { cin >> x; N = max(N, x); }
    vector<long long> D(N + 1), f(N + 1);
    D[0] = 1; f[0] = 1;
    for (int i = 1; i <= N; i++) {
        D[i] = (i * D[i - 1] + (i % 2 ? MOD - 1 : 1)) % MOD;   // D_n = n D_{n-1} + (-1)^n
        f[i] = f[i - 1] * i % MOD;
    }
    string out;
    for (int n : q) out += to_string(D[n] * pw(f[n], MOD - 2) % MOD) + '\n';
    cout << out;
}
