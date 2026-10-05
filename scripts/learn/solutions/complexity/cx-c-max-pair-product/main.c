#include <stdio.h>
#include <limits.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long mx1 = LLONG_MIN, mx2 = LLONG_MIN, mn1 = LLONG_MAX, mn2 = LLONG_MAX;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        if (x > mx1) { mx2 = mx1; mx1 = x; } else if (x > mx2) mx2 = x;
        if (x < mn1) { mn2 = mn1; mn1 = x; } else if (x < mn2) mn2 = x;
    }
    long long p = mx1 * mx2, r = mn1 * mn2;      /* two largest, or two most negative */
    printf("%lld\n", p > r ? p : r);
    return 0;
}
