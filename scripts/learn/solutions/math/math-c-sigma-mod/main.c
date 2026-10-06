#include <stdio.h>
#define M 1000000007LL

static long long power(long long b, long long e) {
    long long r = 1;
    b %= M;
    while (e > 0) {
        if (e & 1) r = r * b % M;
        b = b * b % M;
        e >>= 1;
    }
    return r;
}

int main(void) {
    int k;
    if (scanf("%d", &k) != 1) return 0;
    long long d = 1, s = 1;
    for (int i = 0; i < k; i++) {
        long long p, e, term;
        scanf("%lld %lld", &p, &e);
        d = d * ((e + 1) % M) % M;
        long long r = p % M;
        if (r == 1) term = (e + 1) % M;
        else term = (power(r, e + 1) - 1 + M) % M * power((r - 1 + M) % M, M - 2) % M;
        s = s * term % M;
    }
    printf("%lld %lld\n", d, s);
    return 0;
}
