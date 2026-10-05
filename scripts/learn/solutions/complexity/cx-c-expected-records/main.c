#include <stdio.h>
#include <stdlib.h>

int main(void) {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    int *qs = malloc(sizeof(int) * T);
    int N = 1;
    for (int i = 0; i < T; i++) { scanf("%d", &qs[i]); if (qs[i] > N) N = qs[i]; }
    long long *inv = calloc(N + 1, sizeof(long long)), *H = calloc(N + 1, sizeof(long long));
    inv[1] = 1;
    for (int i = 2; i <= N; i++) inv[i] = (MOD - (MOD / i) * inv[MOD % i] % MOD) % MOD;  /* linear inverses */
    for (int i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % MOD;                      /* H_i mod p */
    for (int i = 0; i < T; i++) { int n = qs[i]; printf("%lld\n", H[n]); }
    free(qs); free(inv); free(H);
    return 0;
}
