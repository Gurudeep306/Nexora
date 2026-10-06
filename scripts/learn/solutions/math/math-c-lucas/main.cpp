#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    long long p;
    int t;
    cin >> p >> t;
    vector<long long> F(p), IF(p);
    F[0] = 1;
    for (long long i = 1; i < p; i++) F[i] = F[i - 1] * i % p;
    auto power = [&](long long b, long long e) {
        long long r = 1;
        b %= p;
        for (; e > 0; e >>= 1, b = b * b % p)
            if (e & 1) r = r * b % p;
        return r;
    };
    IF[p - 1] = power(F[p - 1], p - 2);
    for (long long i = p - 1; i > 0; i--) IF[i - 1] = IF[i] * i % p;
    string out;
    while (t--) {
        long long n, r, res = 1;
        cin >> n >> r;
        while ((n > 0 || r > 0) && res) {               // one base-p digit at a time
            long long a = n % p, b = r % p;
            res = b > a ? 0 : res * F[a] % p * IF[b] % p * IF[a - b] % p;
            n /= p;
            r /= p;
        }
        out += to_string(res);
        out += '\n';
    }
    cout << out;
}
