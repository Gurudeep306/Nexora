#include <stdio.h>
#include <stdlib.h>

static int cmp(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n, k;
    scanf("%d %d", &n, &k);
    long long *a = malloc(sizeof(long long) * n), *s = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) { scanf("%lld", &a[i]); s[i] = a[i]; }
    qsort(s, n, sizeof(long long), cmp);            /* compress values to 0..n-1 */
    int *id = malloc(sizeof(int) * n), *cnt = calloc(n, sizeof(int));
    for (int i = 0; i < n; i++) {
        int lo = 0, hi = n - 1;
        while (lo < hi) { int m = (lo + hi) / 2; if (s[m] < a[i]) lo = m + 1; else hi = m; }
        id[i] = lo;
    }
    int lo = 0, distinct = 0, best = 0;
    for (int hi = 0; hi < n; hi++) {
        if (cnt[id[hi]]++ == 0) distinct++;         /* a new value entered the window */
        while (distinct > k)
            if (--cnt[id[lo++]] == 0) distinct--;   /* a value left completely */
        if (hi - lo + 1 > best) best = hi - lo + 1;
    }
    printf("%d\n", best);
    free(a); free(s); free(id); free(cnt);
    return 0;
}
