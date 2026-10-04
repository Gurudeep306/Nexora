#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, m;
    scanf("%d %d", &n, &m);
    long long *a = malloc(sizeof(long long) * n);
    long long *D = calloc(n + 1, sizeof(long long));
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    while (m--) {
        int l, r;
        long long v;
        scanf("%d %d %lld", &l, &r, &v);
        D[l] += v;                /* the addition starts at l */
        D[r + 1] -= v;            /* ... and stops after r */
    }
    long long run = 0;
    for (int i = 0; i < n; i++) {
        run += D[i];
        printf("%lld%c", a[i] + run, i + 1 == n ? '\n' : ' ');
    }
    free(a);
    free(D);
    return 0;
}
