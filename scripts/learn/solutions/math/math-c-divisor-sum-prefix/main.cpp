#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007LL;

int main() {
    long long n;
    cin >> n;
    long long total = 0;
    for (long long d = 1; d <= n;) {
        long long q = n / d, e = n / q;               // all d' in [d, e] share quotient q
        long long x = d + e, y = e - d + 1;           // sum of d..e = x * y / 2
        if (x % 2 == 0) x /= 2; else y /= 2;          // halve the even factor first
        long long block = (x % MOD) * (y % MOD) % MOD;
        total = (total + (q % MOD) * block) % MOD;
        d = e + 1;
    }
    cout << total << '\n';
}
