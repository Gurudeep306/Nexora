#include <stdio.h>
#define MOD 1000000007LL

long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) { if (e & 1) r = r * b % MOD; b = b * b % MOD; e >>= 1; }
    return r;
}

int main(void) {
    long long m, k;
    scanf("%lld %lld", &m, &k);
    long long e = k % (MOD - 1), S = 0;
    for (long long y = 1; y < m; y++) S = (S + pw(y, e)) % MOD;
    printf("%lld\n", (m - S * pw(pw(m, e), MOD - 2) % MOD + MOD) % MOD);
    return 0;
}
