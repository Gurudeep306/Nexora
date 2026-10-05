#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, q;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    scanf("%d", &q);
    while (q--) {
        long long x;
        scanf("%lld", &x);
        int lo = 0, hi = n - 1, probes = 0;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            probes++;                                /* one read of a[mid] */
            if (a[mid] == x) break;
            if (a[mid] < x) lo = mid + 1; else hi = mid - 1;
        }
        printf("%d\n", probes);
    }
    free(a);
    return 0;
}
