#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007LL;

long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) {
        if (e & 1) r = r * b % MOD;
        b = b * b % MOD;
        e >>= 1;
    }
    return r;
}

int main() {
    long long n;
    int k;
    cin >> n >> k;
    vector<long long> f(k + 1), inv(k + 1);
    f[0] = 1;
    for (int i = 1; i <= k; i++) f[i] = f[i - 1] * i % MOD;
    inv[k] = pw(f[k], MOD - 2);
    for (int i = k; i > 0; i--) inv[i - 1] = inv[i] * i % MOD;
    long long ans = 0;
    for (int i = 0; i <= k; i++) {
        long long c = f[k] * inv[i] % MOD * inv[k - i] % MOD;   // C(k, i)
        long long term = c * pw(k - i, n) % MOD;                // functions avoiding i fixed workers
        ans = (i % 2 ? ans - term + MOD : ans + term) % MOD;
    }
    cout << ans << '\n';
}
