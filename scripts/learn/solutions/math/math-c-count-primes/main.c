#include <stdio.h>

#define N 5000000
static char comp[N + 1];
static int pi[N + 1];

int main(void) {
    comp[0] = comp[1] = 1;
    for (long long p = 2; p * p <= N; p++)
        if (!comp[p])
            for (long long j = p * p; j <= N; j += p) comp[j] = 1;
    for (int v = 1; v <= N; v++) pi[v] = pi[v - 1] + !comp[v];
    int q, n;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        scanf("%d", &n);
        printf("%d\n", pi[n]);
    }
    return 0;
}
