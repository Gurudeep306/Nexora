#include <stdio.h>
#include <stdlib.h>

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

static long long floor_div(long long a, long long b) {   /* b > 0 */
    long long q = a / b;
    if (a % b != 0 && a < 0) q--;
    return q;
}

int main(void) {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long a, b, c, x1, y1, g;
        scanf("%lld %lld %lld", &a, &b, &c);
        if (!min_x(a, b, c, &x1, &y1, &g)) { puts("-1"); continue; }
        long long m = b / g, n = a / g, q = floor_div(y1, n);
        long long cand[4] = {-1, 0, q, q + 1};
        long long bx = 0, by = 0, best = -1;
        for (int i = 0; i < 4; i++) {
            long long x = x1 + cand[i] * m, y = y1 - cand[i] * n;
            long long cost = llabs(x) + llabs(y);
            if (best < 0 || cost < best || (cost == best && x < bx)) { best = cost; bx = x; by = y; }
        }
        printf("%lld %lld\n", bx, by);
    }
    return 0;
}
