#include <stdio.h>
#include <stdlib.h>
#define MOD 1000000007LL

int main(void) {
    int T, N = 1;
    scanf("%d", &T);
    int *ms = malloc(sizeof(int) * T), *cs = malloc(sizeof(int) * T);
    for (int i = 0; i < T; i++) { scanf("%d %d", &ms[i], &cs[i]); if (ms[i] > N) N = ms[i]; }
    long long *inv = malloc(sizeof(long long) * (N + 1)), *H = malloc(sizeof(long long) * (N + 1));
    inv[1] = 1;
    for (int i = 2; i <= N; i++) inv[i] = (MOD - (MOD / i) * inv[MOD % i] % MOD) % MOD;
    H[0] = 0;
    for (int i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % MOD;
    for (int i = 0; i < T; i++)
        printf("%lld\n", (long long)ms[i] * ((H[ms[i]] - H[ms[i] - cs[i]] + MOD) % MOD) % MOD);
    return 0;
}
