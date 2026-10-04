#include <stdio.h>
#include <stdlib.h>

static int cmp(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);
}
static long long absll(long long x) { return x < 0 ? -x : x; }

int main(void) {
    int n;
    long long T;
    scanf("%d %lld", &n, &T);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    qsort(a, n, sizeof(long long), cmp);
    long long best = a[0] + a[1] + a[2];
    for (int i = 0; i < n; i++) {
        int lo = i + 1, hi = n - 1;
        while (lo < hi) {
            long long s = a[i] + a[lo] + a[hi];
            long long d = absll(s - T), bd = absll(best - T);
            if (d < bd || (d == bd && s < best)) best = s;   /* closer, or tie and smaller */
            if (s < T) lo++;
            else if (s > T) hi--;
            else { printf("%lld\n", s); free(a); return 0; }   /* exact hit */
        }
    }
    printf("%lld\n", best);
    free(a);
    return 0;
}
