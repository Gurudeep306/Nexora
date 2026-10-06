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
    long long m, k;
    cin >> m >> k;
    long long e = k % (MOD - 1);              // Fermat: y^k = y^(k mod (p-1)) for y not divisible by p
    long long S = 0;
    for (long long y = 1; y < m; y++) S = (S + pw(y, e)) % MOD;
    long long ans = (m % MOD - S * pw(pw(m, e), MOD - 2) % MOD + MOD) % MOD;   // m - S / m^k
    cout << ans << '\n';
}
