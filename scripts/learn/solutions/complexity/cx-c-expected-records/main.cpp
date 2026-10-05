#include <bits/stdc++.h>
using namespace std;

int main() {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    vector<int> qs(T);
    int N = 1;
    for (auto &n : qs) { scanf("%d", &n); N = max(N, n); }
    vector<long long> inv(N + 1), H(N + 1);
    inv[1] = 1;
    for (int i = 2; i <= N; i++) inv[i] = (MOD - (MOD / i) * inv[MOD % i] % MOD) % MOD;  // linear inverses
    H[0] = 0;
    for (int i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % MOD;                      // H_i mod p
    string out;
    for (int n : qs) { out += to_string(H[n]); out += '\n'; }
    fputs(out.c_str(), stdout);
}
