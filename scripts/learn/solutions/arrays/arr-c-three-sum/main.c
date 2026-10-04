#include <stdio.h>
#include <stdlib.h>

static int cmp(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), count = 0;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    qsort(a, n, sizeof(long long), cmp);
    for (int i = 0; i < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;      /* each first value once */
        int lo = i + 1, hi = n - 1;
        while (lo < hi) {
            long long s = a[i] + a[lo] + a[hi];
            if (s < 0) lo++;
            else if (s > 0) hi--;
            else {
                count++;
                lo++;
                while (lo < hi && a[lo] == a[lo - 1]) lo++;   /* each second value once */
                hi--;
            }
        }
    }
    printf("%lld\n", count);
    free(a);
    return 0;
}
