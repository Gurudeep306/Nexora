#include <stdio.h>

#define MOD 1000000007LL

static long long power(long long b, long long e) {   /* O(log e) square-and-multiply */
    long long r = 1;
    b %= MOD;
    while (e > 0) {
        if (e & 1) r = r * b % MOD;
        b = b * b % MOD;
        e >>= 1;
    }
    return r;
}

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long r, k, rr, ans;
        scanf("%lld %lld", &r, &k);
        rr = r % MOD;
        if (rr == 1) ans = (k + 1) % MOD;              /* every term is 1 mod p */
        else ans = (power(rr, k + 1) - 1 + MOD) % MOD * power(rr - 1 + MOD, MOD - 2) % MOD;
        printf("%lld\n", ans);
    }
    return 0;
}
