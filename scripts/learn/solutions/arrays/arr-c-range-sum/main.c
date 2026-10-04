#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, q;
    scanf("%d %d", &n, &q);
    long long *P = calloc(n + 1, sizeof(long long));   /* P[i] = a[0] + ... + a[i-1] */
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        P[i + 1] = P[i] + x;
    }
    while (q--) {
        int l, r;
        scanf("%d %d", &l, &r);
        printf("%lld\n", P[r + 1] - P[l]);
    }
    free(P);
    return 0;
}
