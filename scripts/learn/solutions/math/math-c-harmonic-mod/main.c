#include <stdio.h>
#include <stdlib.h>

#define P 1000000007LL

int main(void) {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    int *q = malloc(sizeof(int) * t);
    int N = 1;
    for (int i = 0; i < t; i++) { scanf("%d", &q[i]); if (q[i] > N) N = q[i]; }
    long long *inv = malloc(sizeof(long long) * (N + 1));
    long long *H = calloc(N + 1, sizeof(long long));
    inv[1] = 1;
    for (int i = 2; i <= N; i++) inv[i] = P - (P / i) * inv[P % i] % P;   /* inv(i) = -(p/i) * inv(p mod i) */
    for (int i = 1; i <= N; i++) H[i] = (H[i - 1] + inv[i]) % P;
    for (int i = 0; i < t; i++) printf("%lld\n", H[q[i]]);
    return 0;
}
