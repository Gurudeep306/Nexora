#include <bits/stdc++.h>
using namespace std;

int main() {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        long long x = n, y = n + 1;
        if (x % 2 == 0) x /= 2; else y /= 2;          // halve the even factor exactly
        printf("%lld\n", (x % MOD) * (y % MOD) % MOD);  // both < 2^30: product fits
    }
}
