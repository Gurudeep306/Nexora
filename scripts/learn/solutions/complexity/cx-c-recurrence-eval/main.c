#include <stdio.h>

int main(void) {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    while (T--) {
        long long a, b, n, chain[70];
        scanf("%lld %lld %lld", &a, &b, &n);
        int len = 0;
        for (long long m = n; m > 0; m /= b) chain[len++] = m;     /* n, n/b, n/b^2, ... */
        long long t = 0, am = a % MOD;
        for (int i = len - 1; i >= 0; i--) t = (am * t + chain[i] % MOD) % MOD;
        printf("%lld\n", t);
    }
    return 0;
}
