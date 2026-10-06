#include <stdio.h>

#define N 1000000
static int spf[N + 1];

int main(void) {
    for (int p = 2; p <= N; p++) {
        if (spf[p]) continue;
        spf[p] = p;
        for (long long j = (long long)p * p; j <= N; j += p)
            if (!spf[j]) spf[j] = p;
    }
    int q, x;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        scanf("%d", &x);
        int first = 1;
        while (x > 1) {
            printf(first ? "%d" : " %d", spf[x]);
            first = 0;
            x /= spf[x];
        }
        putchar('\n');
    }
    return 0;
}
