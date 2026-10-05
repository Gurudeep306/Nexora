#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    long long T, x, cnt = 0;
    scanf("%d %lld", &n, &T);
    long long *sums = malloc(sizeof(long long) << n);
    int k = 1;
    sums[0] = 0;                                  /* the empty subset */
    for (int i = 0; i < n; i++) {
        scanf("%lld", &x);
        for (int j = 0; j < k; j++) sums[k + j] = sums[j] + x;   /* subsets that take x */
        k *= 2;
    }
    for (int j = 0; j < k; j++) if (sums[j] == T) cnt++;
    printf("%lld\n", cnt);
    free(sums);
    return 0;
}
