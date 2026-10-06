#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    const long long P = 1'000'000'007LL;
    int t;
    cin >> t;
    vector<int> q(t);
    int N = 1;
    for (auto &x : q) { cin >> x; N = max(N, x); }
    vector<long long> inv(N + 1), H(N + 1, 0);
    inv[1] = 1;
    for (int i = 2; i <= N; i++) inv[i] = P - (P / i) * inv[P % i] % P;   // inv(i) = -(p/i) * inv(p mod i)
    for (int i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % P;
    string out;
    for (int x : q) { out += to_string(H[x]); out += '\n'; }
    cout << out;
}
