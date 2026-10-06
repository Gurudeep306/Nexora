#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<int> a(n);
    int M = 1;
    for (auto &x : a) { scanf("%d", &x); M = max(M, x); }
    // linear sieve for the Möbius function
    vector<int> mu(M + 1, 0), primes;
    vector<char> comp(M + 1, 0);
    mu[1] = 1;
    for (int i = 2; i <= M; i++) {
        if (!comp[i]) { primes.push_back(i); mu[i] = -1; }
        for (int p : primes) {
            if ((long long)i * p > M) break;
            comp[i * p] = 1;
            if (i % p == 0) { mu[i * p] = 0; break; }
            mu[i * p] = -mu[i];
        }
    }
    vector<int> freq(M + 1, 0);
    for (int x : a) freq[x]++;
    long long ans = 0;
    for (int d = 1; d <= M; d++) {
        if (!mu[d]) continue;
        long long c = 0;
        for (int v = d; v <= M; v += d) c += freq[v];   // values divisible by d
        ans += mu[d] * (c * (c - 1) / 2);
    }
    printf("%lld\n", ans);
}
