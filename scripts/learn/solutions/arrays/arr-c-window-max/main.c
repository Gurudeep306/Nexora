#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, k;
    scanf("%d %d", &n, &k);
    long long *a = malloc(sizeof(long long) * n), s = 0;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    for (int i = 0; i < k; i++) s += a[i];
    long long best = s;                        /* the first window, not 0 */
    for (int i = k; i < n; i++) {
        s += a[i] - a[i - k];
        if (s > best) best = s;
    }
    printf("%lld\n", best);
    free(a);
    return 0;
}
