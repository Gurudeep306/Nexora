#include <stdio.h>

static long long gcdll(long long a, long long b) {
    while (b) { long long t = a % b; a = b; b = t; }
    return a;
}

int main(void) {
    const long long CAP = 1000000000000000000LL;
    int n;
    scanf("%d", &n);
    long long g = 0, l = 1;
    int over = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        g = gcdll(g, x);
        if (!over) {
            long long q = l / gcdll(l, x);
            if (q > CAP / x) over = 1;
            else l = q * x;
        }
    }
    printf("%lld\n%lld\n", g, over ? -1LL : l);
    return 0;
}
