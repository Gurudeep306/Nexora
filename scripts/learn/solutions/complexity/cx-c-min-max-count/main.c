#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, i;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (i = 0; i < n; i++) scanf("%lld", &a[i]);
    long long mn, mx, comps = 0;
    if (n % 2) { mn = mx = a[0]; i = 1; }
    else {
        comps++;
        if (a[0] < a[1]) { mn = a[0]; mx = a[1]; } else { mn = a[1]; mx = a[0]; }
        i = 2;
    }
    for (; i + 1 < n; i += 2) {
        long long lo = a[i], hi = a[i + 1];
        comps++; if (hi < lo) { long long t = lo; lo = hi; hi = t; }  /* inside the pair */
        comps++; if (lo < mn) mn = lo;                                /* loser vs min */
        comps++; if (hi > mx) mx = hi;                                /* winner vs max */
    }
    printf("%lld %lld %lld\n", mn, mx, comps);
    free(a);
    return 0;
}
