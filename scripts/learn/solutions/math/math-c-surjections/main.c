#include <stdio.h>
#include <stdlib.h>
#define MOD 1000000007LL

long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) {
        if (e & 1) r = r * b % MOD;
        b = b * b % MOD;
        e >>= 1;
    }
    return r;
}

int main(void) {
    long long n;
    int k;
    scanf("%lld %d", &n, &k);
    long long *f = malloc(sizeof(long long) * (k + 1)), *inv = malloc(sizeof(long long) * (k + 1));
    f[0] = 1;
    for (int i = 1; i <= k; i++) f[i] = f[i - 1] * i % MOD;
    inv[k] = pw(f[k], MOD - 2);
    for (int i = k; i > 0; i--) inv[i - 1] = inv[i] * i % MOD;
    long long ans = 0;
    for (int i = 0; i <= k; i++) {
        long long term = f[k] * inv[i] % MOD * inv[k - i] % MOD * pw(k - i, n) % MOD;
        ans = (i % 2 ? ans - term + MOD : ans + term) % MOD;
    }
    printf("%lld\n", ans);
    return 0;
}
