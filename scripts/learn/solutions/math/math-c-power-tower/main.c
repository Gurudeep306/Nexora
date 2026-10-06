#include <stdio.h>
#define P 1000000007LL

static long long power(long long b, long long e, long long m) {
    long long r = 1 % m;
    while (e > 0) {
        if (e & 1) r = r * b % m;
        b = b * b % m;
        e >>= 1;
    }
    return r;
}

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        long long a, b, c, ans;
        scanf("%lld %lld %lld", &a, &b, &c);
        long long r = a % P;
        if (r == 0) ans = (b == 0 && c > 0) ? 1 : 0;
        else ans = power(r, power(b % (P - 1), c, P - 1), P);
        printf("%lld\n", ans);
    }
    return 0;
}
