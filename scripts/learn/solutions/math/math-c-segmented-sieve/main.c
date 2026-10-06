#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int main(void) {
    long long L, R;
    if (scanf("%lld %lld", &L, &R) != 2) return 0;
    long long lim = (long long)sqrt((double)R);
    while (lim * lim > R) lim--;
    while ((lim + 1) * (lim + 1) <= R) lim++;
    char *comp = calloc(lim + 2, 1);
    long long size = R - L + 1;
    char *cross = calloc(size, 1);                /* cross[i] <-> L + i */
    for (long long p = 2; p <= lim; p++) {
        if (comp[p]) continue;
        for (long long j = p * p; j <= lim; j += p) comp[j] = 1;
        long long s = (L + p - 1) / p * p;
        if (s < p * p) s = p * p;
        for (long long j = s; j <= R; j += p) cross[j - L] = 1;
    }
    if (L == 1) cross[0] = 1;
    long long cnt = 0;
    for (long long i = 0; i < size; i++) cnt += !cross[i];
    printf("%lld\n", cnt);
    free(comp);
    free(cross);
    return 0;
}
