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
    for (int k = 0; k < n; k++) scanf("%lld", &a[k]);
    qsort(a, n, sizeof(long long), cmp);
    int i = 0, j = n - 1;
    while (i < j) {
        long long s = a[i] + a[j];
        if (s < T) i++;
        else if (s > T) j--;
        else if (a[i] == a[j]) {                  /* every pair inside [i..j] works */
            long long k = j - i + 1;
            count += k * (k - 1) / 2;
            break;
        } else {                                  /* count the runs of equal values */
            long long ci = 1, cj = 1;
            while (i + 1 < j && a[i + 1] == a[i]) { i++; ci++; }
            while (j - 1 > i && a[j - 1] == a[j]) { j--; cj++; }
            count += ci * cj;
            i++;
            j--;
        }
    }
    printf("%lld\n", count);
    free(a);
    return 0;
}
