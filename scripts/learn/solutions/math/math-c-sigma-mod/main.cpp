#include <bits/stdc++.h>
using namespace std;
const long long M = 1000000007LL;

long long power(long long b, long long e) {      // b < M, e up to ~1e18
    long long r = 1;
    b %= M;
    while (e > 0) {
        if (e & 1) r = r * b % M;
        b = b * b % M;
        e >>= 1;
    }
    return r;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int k;
    cin >> k;
    long long d = 1, s = 1;
    for (int i = 0; i < k; i++) {
        long long p, e;
        cin >> p >> e;
        d = d * ((e + 1) % M) % M;
        long long r = p % M, term;
        if (r == 1) term = (e + 1) % M;                       // every power is 1
        else term = (power(r, e + 1) - 1 + M) % M * power((r - 1 + M) % M, M - 2) % M;
        s = s * term % M;
    }
    cout << d << ' ' << s << '\n';
}
