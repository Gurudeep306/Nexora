#include <stdio.h>

/* smallest x >= 0 with a*x + b*y = c; returns 0 if none */
static int min_x(long long a, long long b, long long c, long long *x, long long *y, long long *gout) {
    long long aa = a, bb = b, x0 = 1, x1 = 0;
    while (bb) {                                   /* iterative extended Euclid */
        long long q = aa / bb, t;
        t = aa - q * bb; aa = bb; bb = t;
        t = x0 - q * x1; x0 = x1; x1 = t;
    }
    long long g = aa;
    if (c % g != 0) return 0;
    long long m = b / g;
    *x = (((x0 % m) + m) % m) * ((((c / g) % m) + m) % m) % m;
    *y = (c - a * *x) / b;
    *gout = g;
    return 1;
}

int main(void) {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long a, b, c, x, y, g;
        scanf("%lld %lld %lld", &a, &b, &c);
        if (min_x(a, b, c, &x, &y, &g)) printf("%lld %lld\n", x, y);
        else puts("-1");
    }
    return 0;
}
