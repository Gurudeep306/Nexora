#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), c1 = 0, c2 = 1;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    int k1 = 0, k2 = 0;
    for (int i = 0; i < n; i++) {
        long long x = a[i];
        if (x == c1) k1++;
        else if (x == c2) k2++;
        else if (k1 == 0) { c1 = x; k1 = 1; }
        else if (k2 == 0) { c2 = x; k2 = 1; }
        else { k1--; k2--; }                     /* discard a triple of different values */
    }
    long long n1 = 0, n2 = 0;
    for (int i = 0; i < n; i++) { if (a[i] == c1) n1++; else if (a[i] == c2) n2++; }
    int ok1 = 3 * n1 > n, ok2 = 3 * n2 > n;      /* verify both candidates */
    if (ok1 && ok2) printf("%lld %lld\n", c1 < c2 ? c1 : c2, c1 < c2 ? c2 : c1);
    else if (ok1) printf("%lld\n", c1);
    else if (ok2) printf("%lld\n", c2);
    else printf("-1\n");
    free(a);
    return 0;
}
