#include <stdio.h>
#include <stdlib.h>

static long long gcdll(long long a, long long b) {
    while (b) { long long t = a % b; a = b; b = t; }
    return a;
}

int main(void) {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long p, q;
        scanf("%lld %lld", &p, &q);
        long long g = gcdll(llabs(p), llabs(q));
        p /= g; q /= g;
        if (q < 0) { p = -p; q = -q; }
        printf("%lld/%lld\n", p, q);
    }
    return 0;
}
