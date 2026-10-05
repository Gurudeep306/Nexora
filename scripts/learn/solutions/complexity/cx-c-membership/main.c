#include <stdio.h>
#include <stdlib.h>

static int cmp(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n, q;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), x;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    qsort(a, n, sizeof(long long), cmp);          /* pay O(n log n) once */
    scanf("%d", &q);
    while (q--) {
        scanf("%lld", &x);
        int lo = 0, hi = n;                       /* x, if present, is in a[lo..hi) */
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] < x) lo = mid + 1; else hi = mid;
        }
        puts(lo < n && a[lo] == x ? "YES" : "NO");
    }
    free(a);
    return 0;
}
