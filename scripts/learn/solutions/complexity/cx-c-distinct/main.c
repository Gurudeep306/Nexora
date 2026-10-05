#include <stdio.h>
#include <stdlib.h>

static int cmp(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    qsort(a, n, sizeof(long long), cmp);          /* equal values become neighbours */
    int distinct = 1;
    for (int i = 1; i < n; i++)
        if (a[i] != a[i - 1]) distinct++;         /* a new block starts here */
    printf("%d\n", distinct);
    free(a);
    return 0;
}
