#include <bits/stdc++.h>
using namespace std;

long long inverse(long long a, long long m) {          // gcd(a, m) = 1
    long long r0 = a % m, r1 = m, s0 = 1, s1 = 0;
    while (r1) {
        long long q = r0 / r1, t;
        t = r0 - q * r1; r0 = r1; r1 = t;
        t = s0 - q * s1; s0 = s1; s1 = t;
    }
    return ((s0 % m) + m) % m;
}

long long power(long long b, long long e, long long m) {
    long long r = 1 % m;
    for (b %= m; e > 0; e >>= 1, b = b * b % m)
        if (e & 1) r = r * b % m;
    return r;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    long long n, m;
    int q;
    cin >> n >> m >> q;
    vector<long long> ps;                               // distinct primes of m
    long long mm = m;
    for (long long d = 2; d * d <= mm; d++)
        if (mm % d == 0) { ps.push_back(d); while (mm % d == 0) mm /= d; }
    if (mm > 1) ps.push_back(mm);
    int w = ps.size();
    vector<long long> unit(n + 1);                      // coprime part of C(n, k) mod m
    vector<vector<int>> ex(w, vector<int>(n + 1, 0));   // exponent of each prime in C(n, k)
    long long u = 1 % m;
    vector<int> c(w, 0);
    unit[0] = u;
    for (long long k = 1; k <= n; k++) {
        long long a = n - k + 1, b = k;
        for (int j = 0; j < w; j++) {
            while (a % ps[j] == 0) { a /= ps[j]; c[j]++; }
            while (b % ps[j] == 0) { b /= ps[j]; c[j]--; }
        }
        u = u * (a % m) % m * inverse(b % m, m) % m;     // b is now coprime to m
        unit[k] = u;
        for (int j = 0; j < w; j++) ex[j][k] = c[j];
    }
    string out;
    while (q--) {
        int k;
        cin >> k;
        long long r = unit[k];
        for (int j = 0; j < w; j++) r = r * power(ps[j], ex[j][k], m) % m;
        out += to_string(r);
        out += '\n';
    }
    cout << out;
}
