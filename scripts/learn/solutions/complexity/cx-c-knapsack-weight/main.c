#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, W;
    scanf("%d %d", &n, &W);
    long long *best = calloc(W + 1, sizeof(long long));
    for (int i = 0; i < n; i++) {
        int w;
        long long v;
        scanf("%d %lld", &w, &v);
        for (int c = W; c >= w; c--)              /* downwards: each item at most once */
            if (best[c - w] + v > best[c]) best[c] = best[c - w] + v;
    }
    printf("%lld\n", best[W]);
    free(best);
    return 0;
}
