#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *h = malloc(sizeof(long long) * n), best = 0;
    for (int k = 0; k < n; k++) scanf("%lld", &h[k]);
    int i = 0, j = n - 1;
    while (i < j) {
        long long lo = h[i] < h[j] ? h[i] : h[j];
        long long area = (long long)(j - i) * lo;
        if (area > best) best = area;
        if (h[i] < h[j]) i++;            /* the shorter wall can never do better */
        else j--;
    }
    printf("%lld\n", best);
    free(h);
    return 0;
}
