#include <stdio.h>
#include <stdlib.h>
#include <limits.h>

int main(void) {
    int n, V = 0;
    long long W;
    scanf("%d %lld", &n, &W);
    long long *w = malloc(sizeof(long long) * n);
    int *v = malloc(sizeof(int) * n);
    for (int i = 0; i < n; i++) { scanf("%lld %d", &w[i], &v[i]); V += v[i]; }
    const long long INF = LLONG_MAX / 4;          /* INF + w cannot overflow */
    long long *mw = malloc(sizeof(long long) * (V + 1));
    mw[0] = 0;
    for (int t = 1; t <= V; t++) mw[t] = INF;
    for (int i = 0; i < n; i++)
        for (int t = V; t >= v[i]; t--)           /* min weight for value exactly t */
            if (mw[t - v[i]] + w[i] < mw[t]) mw[t] = mw[t - v[i]] + w[i];
    int ans = V;
    while (mw[ans] > W) ans--;
    printf("%d\n", ans);
    free(w); free(v); free(mw);
    return 0;
}
