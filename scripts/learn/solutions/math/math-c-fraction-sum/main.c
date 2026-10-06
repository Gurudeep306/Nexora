#include <stdio.h>

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

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long total = 0;
    for (int i = 0; i < n; i++) {
        long long a, b;
        scanf("%lld %lld", &a, &b);
        a = (a % P + P) % P;                             /* negative numerators */
        total = (total + a * power(b, P - 2)) % P;
    }
    printf("%lld\n", total);
    return 0;
}
