#include <bits/stdc++.h>
using namespace std;

int main() {
    long long L, R;
    cin >> L >> R;
    long long lim = sqrtl((long double)R);
    while (lim * lim > R) lim--;
    while ((lim + 1) * (lim + 1) <= R) lim++;
    vector<char> small(lim + 1, 1);
    vector<long long> primes;
    for (long long p = 2; p <= lim; p++) {
        if (!small[p]) continue;
        primes.push_back(p);
        for (long long j = p * p; j <= lim; j += p) small[j] = 0;
    }
    vector<char> seg(R - L + 1, 1);               // seg[i] <-> L + i
    for (long long p : primes) {
        long long s = max(p * p, (L + p - 1) / p * p);
        for (long long j = s; j <= R; j += p) seg[j - L] = 0;
    }
    if (L == 1) seg[0] = 0;
    cout << count(seg.begin(), seg.end(), 1) << '\n';
}
