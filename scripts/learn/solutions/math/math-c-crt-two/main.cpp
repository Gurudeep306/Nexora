#include <bits/stdc++.h>
using namespace std;

// inverse of a modulo m (gcd(a, m) = 1), extended Euclid
long long inverse(long long a, long long m) {
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
    int t;
    cin >> t;
    string out;
    while (t--) {
        long long a1, m1, a2, m2;
        cin >> a1 >> m1 >> a2 >> m2;
        long long g = gcd(m1, m2);
        long long d = ((a2 - a1) % m2 + m2) % m2;
        if (d % g != 0) { out += "-1\n"; continue; }
        long long mg = m2 / g;
        long long k = (d / g) % mg * inverse(m1 / g % mg, mg) % mg;   // m1 * k ≡ d (mod m2)
        out += to_string(a1 + m1 * k);                                // < lcm(m1, m2) <= 1e18
        out += '\n';
    }
    cout << out;
}
