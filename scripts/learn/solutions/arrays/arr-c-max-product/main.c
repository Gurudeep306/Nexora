#include <stdio.h>

int main(void) {
    int n;
    long long x, hi, lo, best, t;
    scanf("%d %lld", &n, &x);
    hi = lo = best = x;                              /* max / min product ending here */
    for (int i = 1; i < n; i++) {
        scanf("%lld", &x);
        if (x < 0) { t = hi; hi = lo; lo = t; }      /* a negative flips max and min */
        hi = (hi * x > x) ? hi * x : x;
        lo = (lo * x < x) ? lo * x : x;
        if (hi > best) best = hi;
    }
    printf("%lld\n", best);
    return 0;
}
