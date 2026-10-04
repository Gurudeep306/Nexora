#include <stdio.h>
#include <stdlib.h>

static int n, *a;

static long long at_most(int K) {                 /* subarrays with at most K odd numbers */
    long long total = 0;
    int lo = 0, odd = 0;
    for (int hi = 0; hi < n; hi++) {
        odd += a[hi] & 1;
        while (odd > K) odd -= a[lo++] & 1;
        total += hi - lo + 1;                     /* every start in [lo, hi] */
    }
    return total;
}

int main(void) {
    int k;
    scanf("%d %d", &n, &k);
    a = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    printf("%lld\n", at_most(k) - at_most(k - 1));
    free(a);
    return 0;
}
