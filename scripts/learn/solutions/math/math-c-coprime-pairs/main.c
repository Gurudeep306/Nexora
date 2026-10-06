#include <stdio.h>

#define N 1000000
static int phi[N + 1];
static long long pre[N + 1];

int main(void) {
    for (int v = 0; v <= N; v++) phi[v] = v;
    for (int p = 2; p <= N; p++)
        if (phi[p] == p)
            for (int j = p; j <= N; j += p) phi[j] -= phi[j] / p;
    for (int v = 1; v <= N; v++) pre[v] = pre[v - 1] + phi[v];
    int q, n;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        scanf("%d", &n);
        printf("%lld\n", 2 * pre[n] - 1);
    }
    return 0;
}
