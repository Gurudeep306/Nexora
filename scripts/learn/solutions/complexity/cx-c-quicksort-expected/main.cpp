#include <bits/stdc++.h>
using namespace std;

int main() {
    const long long P = 1000000007LL;
    int T;
    if (scanf("%d", &T) != 1) return 0;
    vector<int> q(T);
    int mx = 1;
    for (auto &n : q) { scanf("%d", &n); mx = max(mx, n); }
    vector<long long> inv(mx + 1), H(mx + 1, 0);
    inv[1] = 1;
    for (int i = 2; i <= mx; i++) inv[i] = (P - (P / i) * inv[P % i] % P) % P;  // linear inverses
    for (int i = 1; i <= mx; i++) H[i] = (H[i - 1] + inv[i]) % P;            // H_i mod p
    string out;
    for (int n : q) {
        long long ans = (2LL * (n + 1) % P * H[n] % P - 4LL * n % P + P) % P;  // 2(n+1)H_n - 4n
        out += to_string(ans);
        out += '\n';
    }
    fputs(out.c_str(), stdout);
}
