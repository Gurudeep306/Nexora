#include <stdio.h>

static long long powmod(long long a, long long b, long long m) {
    long long result = 1 % m, base = a % m;
    while (b > 0) {
        if (b & 1) result = result * base % m;    /* this bit of b is set */
        base = base * base % m;                   /* a^(2^k) for the next bit */
        b >>= 1;
    }
    return result;
}

int main(void) {
    int Q;
    scanf("%d", &Q);
    while (Q--) {
        long long a, b, m;
        scanf("%lld %lld %lld", &a, &b, &m);
        printf("%lld\n", powmod(a, b, m));
    }
    return 0;
}
