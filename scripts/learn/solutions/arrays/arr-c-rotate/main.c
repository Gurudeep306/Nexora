#include <stdio.h>
#include <stdlib.h>

static void rev(long long *a, int i, int j) {   /* reverse a[i..j] */
    for (; i < j; i++, j--) { long long t = a[i]; a[i] = a[j]; a[j] = t; }
}

int main(void) {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int r = (int)(k % n);                 /* only k mod n matters */
    rev(a, 0, n - 1);
    rev(a, 0, r - 1);
    rev(a, r, n - 1);
    for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
    free(a);
    return 0;
}
