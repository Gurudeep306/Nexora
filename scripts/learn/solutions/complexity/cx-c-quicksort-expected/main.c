#include <stdio.h>
#include <stdlib.h>

int main(void) {
    const long long P = 1000000007LL;
    int T;
    if (scanf("%d", &T) != 1) return 0;
    int *q = malloc(sizeof(int) * T);
    int mx = 1;
    for (int i = 0; i < T; i++) { scanf("%d", &q[i]); if (q[i] > mx) mx = q[i]; }
    long long *inv = malloc(sizeof(long long) * (mx + 1));
    long long *H = calloc(mx + 1, sizeof(long long));
    inv[1] = 1;
    for (int i = 2; i <= mx; i++) inv[i] = (P - (P / i) * inv[P % i] % P) % P;  /* linear inverses */
    for (int i = 1; i <= mx; i++) H[i] = (H[i - 1] + inv[i]) % P;
    for (int i = 0; i < T; i++) {
        long long n = q[i];
        printf("%lld\n", (2 * (n + 1) % P * H[n] % P - 4 * n % P + P) % P);
    }
    free(q); free(inv); free(H);
    return 0;
}
