#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int *a = malloc(sizeof(int) * n);
    int M = 1;
    for (int i = 0; i < n; i++) { scanf("%d", &a[i]); if (a[i] > M) M = a[i]; }
    int *mu = calloc(M + 1, sizeof(int));
    int *primes = malloc(sizeof(int) * (M + 1));
    char *comp = calloc(M + 1, 1);
    int pc = 0;
    mu[1] = 1;
    for (int i = 2; i <= M; i++) {
        if (!comp[i]) { primes[pc++] = i; mu[i] = -1; }
        for (int j = 0; j < pc; j++) {
            int p = primes[j];
            if ((long long)i * p > M) break;
            comp[i * p] = 1;
            if (i % p == 0) { mu[i * p] = 0; break; }
            mu[i * p] = -mu[i];
        }
    }
    int *freq = calloc(M + 1, sizeof(int));
    for (int i = 0; i < n; i++) freq[a[i]]++;
    long long ans = 0;
    for (int d = 1; d <= M; d++) {
        if (!mu[d]) continue;
        long long c = 0;
        for (int v = d; v <= M; v += d) c += freq[v];
        ans += mu[d] * (c * (c - 1) / 2);
    }
    printf("%lld\n", ans);
    return 0;
}
