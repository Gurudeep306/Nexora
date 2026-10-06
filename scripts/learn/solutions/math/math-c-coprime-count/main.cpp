#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int T;
    cin >> T;
    while (T--) {
        long long n, m;
        cin >> n >> m;
        vector<long long> ps;                       // distinct primes of m
        for (long long d = 2; d * d <= m; d++)
            if (m % d == 0) {
                ps.push_back(d);
                while (m % d == 0) m /= d;
            }
        if (m > 1) ps.push_back(m);
        int r = ps.size();
        long long total = 0;
        for (int mask = 0; mask < (1 << r); mask++) {
            long long d = 1;
            int bits = 0;
            for (int i = 0; i < r; i++)
                if (mask >> i & 1) { d *= ps[i]; bits++; }
            total += (bits % 2 ? -1 : 1) * (n / d);  // inclusion-exclusion term
        }
        cout << total << '\n';
    }
}
