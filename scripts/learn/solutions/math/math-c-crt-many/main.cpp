#include <bits/stdc++.h>
using namespace std;

long long inverse(long long a, long long m) {      // gcd(a, m) = 1
    long long r0 = a % m, r1 = m, s0 = 1, s1 = 0;
    while (r1) {
        long long q = r0 / r1, t;
        t = r0 - q * r1; r0 = r1; r1 = t;
        t = s0 - q * s1; s0 = s1; s1 = t;
    }
    return ((s0 % m) + m) % m;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long X = 0, M = 1;                         // all x ≡ X (mod M) satisfy the prefix
    bool ok = true;
    for (int i = 0; i < n; i++) {
        long long a, m;
        cin >> a >> m;
        if (!ok) continue;
        long long g = gcd(M, m);
        long long d = ((a - X % m) % m + m) % m;
        if (d % g != 0) { ok = false; continue; }
        long long mg = m / g;
        long long k = (d / g) % mg * inverse(M / g % mg, mg) % mg;
        X += M * k;                                 // M * k < M * mg = lcm <= 1e18
        M = M / g * m;
    }
    cout << (ok ? X : -1) << '\n';
}
