#include <stdio.h>
#include <stdlib.h>

static long long inverse(long long a, long long m) {   /* gcd(a, m) = 1 */
    long long r0 = a % m, r1 = m, s0 = 1, s1 = 0;
    while (r1) {
        long long q = r0 / r1, t;
        t = r0 - q * r1; r0 = r1; r1 = t;
        t = s0 - q * s1; s0 = s1; s1 = t;
    }
    return ((s0 % m) + m) % m;
}

static long long power(long long b, long long e, long long m) {
    long long r = 1 % m;
    for (b %= m; e > 0; e >>= 1, b = b * b % m)
        if (e & 1) r = r * b % m;
    return r;
}

int main(void) {
    long long n, m;
    int q;
    if (scanf("%lld %lld %d", &n, &m, &q) != 3) return 0;
    long long ps[12];
    int w = 0;
    long long mm = m;
    for (long long d = 2; d * d <= mm; d++)
        if (mm % d == 0) { ps[w++] = d; while (mm % d == 0) mm /= d; }
    if (mm > 1) ps[w++] = mm;
    long long *unit = malloc(sizeof(long long) * (n + 1));   /* coprime part of C(n, k) mod m */
    int *ex = calloc((size_t)(w ? w : 1) * (n + 1), sizeof(int)); /* ex[j*(n+1)+k] */
    int c[12] = {0};
    long long u = 1 % m;
    unit[0] = u;
    for (long long k = 1; k <= n; k++) {
        long long a = n - k + 1, b = k;
        for (int j = 0; j < w; j++) {
            while (a % ps[j] == 0) { a /= ps[j]; c[j]++; }
            while (b % ps[j] == 0) { b /= ps[j]; c[j]--; }
            ex[j * (n + 1) + k] = c[j];
        }
        u = u * (a % m) % m * inverse(b % m, m) % m;     /* b is now coprime to m */
        unit[k] = u;
    }
    while (q--) {
        int k;
        scanf("%d", &k);
        long long r = unit[k];
        for (int j = 0; j < w; j++) r = r * power(ps[j], ex[j * (n + 1) + k], m) % m;
        printf("%lld\n", r);
    }
    return 0;
}
