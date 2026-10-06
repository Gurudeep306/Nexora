#include <stdio.h>
#include <stdlib.h>

static int cmp(const void *x, const void *y) {
    long long a = *(const long long *)x, b = *(const long long *)y;
    return (a > b) - (a < b);
}

int main(void) {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);
    long long *r = malloc(sizeof(long long) * (n + 1));
    r[0] = 0;
    for (int i = 1; i <= n; i++) {
        long long x;
        scanf("%lld", &x);
        r[i] = ((r[i - 1] + x) % k + k) % k;
    }
    qsort(r, n + 1, sizeof(long long), cmp);
    long long ans = 0;
    for (int i = 0, j; i <= n; i = j) {
        for (j = i; j <= n && r[j] == r[i]; j++) {}
        long long c = j - i;
        ans += c * (c - 1) / 2;
    }
    printf("%lld\n", ans);
    free(r);
    return 0;
}
