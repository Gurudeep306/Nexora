#include <stdio.h>
#define N 200000

int mu[N + 1], primes[N];
char comp[N + 1];
long long pre[N + 1];

int main(void) {
    int pc = 0;
    mu[1] = 1;
    for (int i = 2; i <= N; i++) {
        if (!comp[i]) { primes[pc++] = i; mu[i] = -1; }
        for (int j = 0; j < pc; j++) {
            int p = primes[j];
            if ((long long)i * p > N) break;
            comp[i * p] = 1;
            if (i % p == 0) { mu[i * p] = 0; break; }
            mu[i * p] = -mu[i];
        }
    }
    for (int i = 1; i <= N; i++) pre[i] = pre[i - 1] + mu[i];
    int T;
    scanf("%d", &T);
    while (T--) {
        long long a, b, k;
        scanf("%lld %lld %lld", &a, &b, &k);
        long long A = a / k, B = b / k, res = 0, lim = A < B ? A : B;
        for (long long d = 1; d <= lim;) {
            long long qa = A / d, qb = B / d;
            long long ea = A / qa, eb = B / qb, e = ea < eb ? ea : eb;
            res += (pre[e] - pre[d - 1]) * qa * qb;
            d = e + 1;
        }
        printf("%lld\n", res);
    }
    return 0;
}
