#include <stdio.h>
#include <stdlib.h>

static int cmp(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n;
    long long T, count = 0;
    scanf("%d %lld", &n, &T);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    qsort(a, n, sizeof(long long), cmp);
    for (int i = 0; i < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;
        for (int j = i + 1; j < n; j++) {
            if (j > i + 1 && a[j] == a[j - 1]) continue;
            int lo = j + 1, hi = n - 1;
            while (lo < hi) {
                long long s = a[i] + a[j] + a[lo] + a[hi];
                if (s < T) lo++;
                else if (s > T) hi--;
                else {
                    count++;
                    lo++;
                    while (lo < hi && a[lo] == a[lo - 1]) lo++;
                    hi--;
                }
            }
        }
    }
    printf("%lld\n", count);
    free(a);
    return 0;
}
