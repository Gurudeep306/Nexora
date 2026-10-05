#include <stdio.h>
#include <stdlib.h>

static int cmp(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);                         /* never subtract: it can overflow */
}

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    qsort(a, n, sizeof(long long), cmp);
    long long best = a[1] - a[0];
    for (int i = 1; i + 1 < n; i++)
        if (a[i + 1] - a[i] < best) best = a[i + 1] - a[i];
    printf("%lld\n", best);
    free(a);
    return 0;
}
