#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    long long S;
    scanf("%d %lld", &n, &S);
    long long *a = malloc(sizeof(long long) * n), s = 0;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int lo = 0, best = n + 1;
    for (int hi = 0; hi < n; hi++) {
        s += a[hi];                               /* extend to the right */
        while (s >= S) {                          /* big enough: record, then shrink */
            if (hi - lo + 1 < best) best = hi - lo + 1;
            s -= a[lo++];
        }
    }
    printf("%d\n", best == n + 1 ? 0 : best);
    free(a);
    return 0;
}
