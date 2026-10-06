#include <stdio.h>

/* inverse of a modulo m, or -1 if gcd(a, m) != 1 */
static long long inverse(long long a, long long m) {
    long long r0 = a % m, r1 = m, s0 = 1, s1 = 0;    /* invariant: r_i = a * s_i (mod m) */
    while (r1 != 0) {
        long long q = r0 / r1, t;
        t = r0 - q * r1; r0 = r1; r1 = t;
        t = s0 - q * s1; s0 = s1; s1 = t;
    }
    if (r0 != 1) return -1;
    return ((s0 % m) + m) % m;
}

int main(void) {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        long long a, m;
        scanf("%lld %lld", &a, &m);
        printf("%lld\n", inverse(a, m));
    }
    return 0;
}
