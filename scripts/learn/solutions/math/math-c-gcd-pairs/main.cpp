#include <bits/stdc++.h>
using namespace std;
const int N = 200000;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    vector<int> mu(N + 1, 1), primes;
    vector<char> comp(N + 1, 0);
    mu[0] = 0;
    for (int i = 2; i <= N; i++) {                    // linear sieve for Mobius
        if (!comp[i]) { primes.push_back(i); mu[i] = -1; }
        for (int p : primes) {
            if ((long long)i * p > N) break;
            comp[i * p] = 1;
            if (i % p == 0) { mu[i * p] = 0; break; }
            mu[i * p] = -mu[i];
        }
    }
    vector<long long> pre(N + 1, 0);
    for (int i = 1; i <= N; i++) pre[i] = pre[i - 1] + mu[i];
    int T;
    cin >> T;
    while (T--) {
        long long a, b, k;
        cin >> a >> b >> k;
        long long A = a / k, B = b / k, res = 0;
        for (long long d = 1, lim = min(A, B); d <= lim;) {
            long long qa = A / d, qb = B / d;
            long long e = min(A / qa, B / qb);        // both quotients constant on [d, e]
            res += (pre[e] - pre[d - 1]) * qa * qb;
            d = e + 1;
        }
        cout << res << '\n';
    }
}
