#include <bits/stdc++.h>
using namespace std;

// inverse of a modulo m, or -1 if gcd(a, m) != 1
long long inverse(long long a, long long m) {
    long long r0 = a % m, r1 = m, s0 = 1, s1 = 0;   // invariant: r_i ≡ a * s_i (mod m)
    while (r1 != 0) {
        long long q = r0 / r1;
        long long t = r0 - q * r1; r0 = r1; r1 = t;
        t = s0 - q * s1; s0 = s1; s1 = t;
    }
    if (r0 != 1) return -1;                           // gcd(a, m) = r0
    return ((s0 % m) + m) % m;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;
    cin >> t;
    string out;
    while (t--) {
        long long a, m;
        cin >> a >> m;
        out += to_string(inverse(a, m));
        out += '\n';
    }
    cout << out;
}
