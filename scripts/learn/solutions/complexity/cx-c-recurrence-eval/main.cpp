#include <bits/stdc++.h>
using namespace std;

int main() {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    while (T--) {
        long long a, b, n;
        scanf("%lld %lld %lld", &a, &b, &n);
        long long chain[70];
        int len = 0;
        for (long long m = n; m > 0; m /= b) chain[len++] = m;     // n, n/b, n/b^2, ...
        long long t = 0, am = a % MOD;
        for (int i = len - 1; i >= 0; i--) t = (am * t + chain[i] % MOD) % MOD;  // bottom-up
        printf("%lld\n", t);
    }
}
