#include <stdio.h>
#include <stdlib.h>
#define P 1000000007LL

static long long power(long long b, long long e) {
    long long r = 1;
    b %= P;
    while (e > 0) {
        if (e & 1) r = r * b % P;
        b = b * b % P;
        e >>= 1;
    }
    return r;
}

static long long *F, *IF;
static void build_fact(int N) {               /* factorials and inverse factorials up to N */
    F = malloc(sizeof(long long) * (N + 1));
    IF = malloc(sizeof(long long) * (N + 1));
    F[0] = 1;
    for (int i = 1; i <= N; i++) F[i] = F[i - 1] * i % P;
    IF[N] = power(F[N], P - 2);
    for (int i = N; i > 0; i--) IF[i - 1] = IF[i] * i % P;
}
static long long C(long long n, long long r) {
    if (r < 0 || n < 0 || r > n) return 0;
    return F[n] * IF[r] % P * IF[n - r] % P;
}

int main(void) {
    build_fact(2000000);
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        long long n, m, x, y;
        scanf("%lld %lld %lld %lld", &n, &m, &x, &y);
        long long through = C(x + y - 2, x - 1) * C(n - x + m - y, n - x) % P;   /* to rock x from rock */
        printf("%lld\n", (C(n + m - 2, n - 1) - through + P) % P);
    }
    return 0;
}
