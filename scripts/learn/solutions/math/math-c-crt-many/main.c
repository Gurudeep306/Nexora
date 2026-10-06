#include <stdio.h>

static long long gcd(long long a, long long b) { while (b) { long long t = a % b; a = b; b = t; } return a; }

static long long inverse(long long a, long long m) {   /* gcd(a, m) = 1 */
    long long r0 = a % m, r1 = m, s0 = 1, s1 = 0;
    while (r1) {
        long long q = r0 / r1, t;
        t = r0 - q * r1; r0 = r1; r1 = t;
        t = s0 - q * s1; s0 = s1; s1 = t;
    }
    return ((s0 % m) + m) % m;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long X = 0, M = 1;                          /* all x = X (mod M) satisfy the prefix */
    int ok = 1;
    for (int i = 0; i < n; i++) {
        long long a, m;
        scanf("%lld %lld", &a, &m);
        if (!ok) continue;
        long long g = gcd(M, m);
        long long d = ((a - X % m) % m + m) % m;
        if (d % g != 0) { ok = 0; continue; }
        long long mg = m / g;
        long long k = (d / g) % mg * inverse(M / g % mg, mg) % mg;
        X += M * k;                                  /* < lcm <= 1e18 */
        M = M / g * m;
    }
    printf("%lld\n", ok ? X : -1LL);
    return 0;
}
