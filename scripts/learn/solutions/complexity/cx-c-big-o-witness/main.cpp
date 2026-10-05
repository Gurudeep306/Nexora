#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long a, C, b, c;
        scanf("%lld %lld %lld %lld", &a, &C, &b, &c);
        long long d = C - a;
        auto q = [&](long long n) { return d * n * n - b * n - c; };
        long long c0 = max(1LL, b > 0 ? b / (2 * d) : 0);   // integer minimiser is c0 or c0 + 1
        long long m = q(c0 + 1) < 0 ? c0 + 1 : q(c0) < 0 ? c0 : 0;
        if (m == 0) { puts("1"); continue; }                  // q >= 0 for every n >= 1
        long long lo = m, hi = 2000000;                       // q(lo) < 0, q(hi) >= 0
        while (lo < hi) {                                     // last n with q(n) < 0
            long long mid = (lo + hi + 1) / 2;
            if (q(mid) < 0) lo = mid; else hi = mid - 1;
        }
        printf("%lld\n", lo + 1);
    }
}
