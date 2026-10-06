#include <stdio.h>
#include <stdlib.h>
#define MOD 1000000007LL

long long pw(long long b, long long e) {
    long long r = 1;
    b %= MOD;
    while (e) { if (e & 1) r = r * b % MOD; b = b * b % MOD; e >>= 1; }
    return r;
}

int main(void) {
    int T, N = 1;
    scanf("%d", &T);
    int *q = malloc(sizeof(int) * T);
    for (int i = 0; i < T; i++) { scanf("%d", &q[i]); if (q[i] > N) N = q[i]; }
    long long *D = malloc(sizeof(long long) * (N + 1)), *f = malloc(sizeof(long long) * (N + 1));
    D[0] = 1; f[0] = 1;
    for (int i = 1; i <= N; i++) {
        D[i] = (i * D[i - 1] + (i % 2 ? MOD - 1 : 1)) % MOD;
        f[i] = f[i - 1] * i % MOD;
    }
    for (int i = 0; i < T; i++) printf("%lld\n", D[q[i]] * pw(f[q[i]], MOD - 2) % MOD);
    return 0;
}
