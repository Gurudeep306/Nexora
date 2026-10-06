#include <stdio.h>
#include <stdlib.h>

int main(void) {
    long long p;
    int t;
    if (scanf("%lld %d", &p, &t) != 2) return 0;
    long long *F = malloc(sizeof(long long) * p), *IF = malloc(sizeof(long long) * p);
    F[0] = 1;
    for (long long i = 1; i < p; i++) F[i] = F[i - 1] * i % p;
    long long b = F[p - 1], e = p - 2, inv = 1;
    for (; e > 0; e >>= 1, b = b * b % p) if (e & 1) inv = inv * b % p;
    IF[p - 1] = inv;
    for (long long i = p - 1; i > 0; i--) IF[i - 1] = IF[i] * i % p;
    while (t--) {
        long long n, r, res = 1;
        scanf("%lld %lld", &n, &r);
        while ((n > 0 || r > 0) && res) {                /* one base-p digit at a time */
            long long a = n % p, c = r % p;
            res = c > a ? 0 : res * F[a] % p * IF[c] % p * IF[a - c] % p;
            n /= p;
            r /= p;
        }
        printf("%lld\n", res);
    }
    return 0;
}
