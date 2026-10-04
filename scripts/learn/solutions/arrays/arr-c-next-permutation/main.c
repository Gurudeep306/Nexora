#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), t;
    for (int k = 0; k < n; k++) scanf("%lld", &a[k]);
    int i = n - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;            /* pivot: last ascent */
    if (i >= 0) {
        int j = n - 1;
        while (a[j] <= a[i]) j--;                      /* rightmost value bigger than the pivot */
        t = a[i]; a[i] = a[j]; a[j] = t;
    }
    for (int l = i + 1, r = n - 1; l < r; l++, r--) { t = a[l]; a[l] = a[r]; a[r] = t; }
    for (int k = 0; k < n; k++) printf("%lld%c", a[k], k + 1 == n ? '\n' : ' ');
    free(a);
    return 0;
}
